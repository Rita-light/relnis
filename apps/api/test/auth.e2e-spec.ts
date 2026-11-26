import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurerApp } from '../src/configurer-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

// Désactive la limite par adresse IP (seulement quand NODE_ENV=test), sauf dans les tests de limites.
const SANS_LIMITE = { 'x-test-sans-limite': '1' };

// Tests de bout en bout : vraie API + vraie base. Les courriels restent en mémoire (aucun envoi).
describe('Authentification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const boiteCourriels = new InMemoryMailTransport();
  const courrielsCrees: string[] = [];

  // Un courriel unique par test : les tests ne se gênent pas entre eux.
  const nouvelleInscription = () => {
    const courriel = `test-${randomUUID()}@exemple.ca`;
    courrielsCrees.push(courriel);
    return {
      nomEntreprise: 'Plomberie Test',
      prenom: 'Marie',
      nom: 'Tremblay',
      courriel,
      motDePasse: 'un-mot-de-passe-solide',
      accepteConditions: true,
    };
  };

  const serveur = () => request(app.getHttpServer());
  const envoyer = (adresse: string, corps: object) =>
    serveur().post(adresse).set(SANS_LIMITE).send(corps);
  const inscrire = (donnees: object) =>
    envoyer('/api/v1/auth/inscription', donnees);
  const verifier = (jeton: string) =>
    envoyer('/api/v1/auth/verifier-courriel', { jeton });
  const renvoyer = (courriel: string) =>
    envoyer('/api/v1/auth/renvoyer-verification', { courriel });

  // Lit le jeton dans le dernier courriel reçu par cette adresse.
  const jetonRecu = (courriel: string) =>
    boiteCourriels
      .assertSent({ to: courriel })
      .link('/verifier-courriel')
      .searchParams.get('jeton') ?? '';

  const connecter = (courriel: string, motDePasse: string) =>
    envoyer('/api/v1/auth/connexion', { courriel, motDePasse });

  // Crée un compte au courriel vérifié, prêt à se connecter.
  const compteVerifie = async () => {
    const donnees = nouvelleInscription();
    await inscrire(donnees).expect(201);
    await verifier(jetonRecu(donnees.courriel)).expect(200);
    return donnees;
  };

  // Les cookies posés par une réponse, sous forme de tableau de chaînes.
  const cookies = (res: { headers: Record<string, string | string[] | undefined> }) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []);

  // La valeur d'un cookie posé par une réponse (undefined s'il n'a pas été posé).
  const valeurCookie = (
    res: { headers: Record<string, string | string[] | undefined> },
    nom: string,
  ) =>
    cookies(res)
      .find((c) => c.startsWith(`${nom}=`))
      ?.split(';')[0]
      .slice(nom.length + 1);

  // Envoie un jeton de renouvellement, comme le ferait le navigateur avec son cookie.
  const renouveler = (jeton: string) =>
    serveur()
      .post('/api/v1/auth/renouveler')
      .set(SANS_LIMITE)
      .set('Cookie', `relnis_renouvellement=${jeton}`);

  // Un compte vérifié et connecté : son courriel et son jeton de renouvellement.
  const sessionOuverte = async () => {
    const { courriel, motDePasse } = await compteVerifie();
    const res = await connecter(courriel, motDePasse).expect(200);
    return { courriel, jeton: valeurCookie(res, 'relnis_renouvellement') ?? '' };
  };

  const sessionDe = (courriel: string) =>
    prisma.session.findFirstOrThrow({ where: { utilisateur: { courriel } } });

  // Démarre l'API une fois, avec les mêmes réglages que main.ts, mais la boîte en mémoire.
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailTransport)
      .useValue(boiteCourriels)
      .compile();
    app = module.createNestApplication();
    configurerApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Repart de compteurs vides. Sécurité : seulement sur la base Redis n° 15 des tests.
    expect(process.env.REDIS_URL).toMatch(/\/15$/);
    await app.get(RedisService).flushdb();
  });

  afterAll(async () => {
    // Nettoyage des données de test (seule exception à « on ne supprime jamais »).
    const utilisateurs = await prisma.utilisateur.findMany({
      where: { courriel: { in: courrielsCrees } },
    });
    const ids = utilisateurs.map((u) => u.id);
    await prisma.session.deleteMany({ where: { utilisateurId: { in: ids } } });
    await prisma.jeton.deleteMany({ where: { utilisateurId: { in: ids } } });
    await prisma.utilisateur.deleteMany({ where: { id: { in: ids } } });
    await prisma.entreprise.deleteMany({
      where: { id: { in: utilisateurs.map((u) => u.entrepriseId) } },
    });
    await app.close();
  });

  describe('Inscription', () => {
    it("crée l'entreprise et son administrateur, mot de passe haché", async () => {
      const donnees = nouvelleInscription();
      const res = await inscrire(donnees).expect(201);

      const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
        where: { id: res.body.utilisateurId },
      });
      expect(utilisateur.entrepriseId).toBe(res.body.entrepriseId);
      expect(utilisateur.role).toBe('ADMINISTRATEUR');
      expect(utilisateur.courrielVerifie).toBe(false);
      // Argon2id avec les réglages OWASP (écrits dans la chaîne enregistrée).
      expect(utilisateur.motDePasseHache).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    });

    it('enregistre le courriel en minuscules', async () => {
      const donnees = nouvelleInscription();
      const res = await inscrire({
        ...donnees,
        courriel: donnees.courriel.toUpperCase(),
      }).expect(201);

      const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
        where: { id: res.body.utilisateurId },
      });
      expect(utilisateur.courriel).toBe(donnees.courriel);
    });

    it('refuse un courriel déjà utilisé, même écrit autrement (409)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);

      const res = await inscrire({
        ...donnees,
        courriel: donnees.courriel.toUpperCase(),
      }).expect(409);
      expect(res.body.code).toBe('COURRIEL_DEJA_UTILISE');
    });

    it('refuse des données invalides et dit quels champs (400)', async () => {
      const res = await inscrire({
        ...nouvelleInscription(),
        courriel: 'pas-un-courriel',
        motDePasse: 'court',
      }).expect(400);

      expect(res.body.code).toBe('DONNEES_INVALIDES');
      expect(res.body.details.champs).toHaveProperty('courriel');
      expect(res.body.details.champs).toHaveProperty('motDePasse');
    });

    it('refuse si les conditions ne sont pas acceptées (400)', async () => {
      const res = await inscrire({
        ...nouvelleInscription(),
        accepteConditions: false,
      }).expect(400);

      expect(res.body.details.champs).toHaveProperty('accepteConditions');
    });

    it('refuse un champ non prévu, ex. se donner un rôle (400)', async () => {
      const res = await inscrire({
        ...nouvelleInscription(),
        role: 'COMPTABLE',
      }).expect(400);

      expect(res.body.code).toBe('DONNEES_INVALIDES');
    });
  });

  describe('Vérification du courriel', () => {
    it('envoie un lien et confirme le courriel avec le bon jeton', async () => {
      const donnees = nouvelleInscription();
      const res = await inscrire(donnees).expect(201);

      // Le courriel est rendu à partir des modèles, en HTML et en texte.
      const courriel = boiteCourriels.assertSent({ to: donnees.courriel });
      expect(courriel.subject).toBe('Confirmez votre adresse courriel');
      expect(courriel.html).toContain('Bonjour Marie');
      expect(courriel.text).toContain('/verifier-courriel?jeton=');

      await verifier(jetonRecu(donnees.courriel)).expect(200);

      const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
        where: { id: res.body.utilisateurId },
      });
      expect(utilisateur.courrielVerifie).toBe(true);
    });

    it('refuse un jeton déjà utilisé (400)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);
      const jeton = jetonRecu(donnees.courriel);

      await verifier(jeton).expect(200);
      const res = await verifier(jeton).expect(400);
      expect(res.body.code).toBe('JETON_INVALIDE');
    });

    it('refuse un jeton inventé (400)', async () => {
      const res = await verifier('jeton-invente').expect(400);
      expect(res.body.code).toBe('JETON_INVALIDE');
    });

    it('refuse un jeton expiré (400)', async () => {
      const donnees = nouvelleInscription();
      const res = await inscrire(donnees).expect(201);
      const jeton = jetonRecu(donnees.courriel);

      // On fait vieillir le jeton directement en base.
      await prisma.jeton.updateMany({
        where: { utilisateurId: res.body.utilisateurId },
        data: { expireLe: new Date(Date.now() - 1000) },
      });

      const reponse = await verifier(jeton).expect(400);
      expect(reponse.body.code).toBe('JETON_EXPIRE');
    });

    it("renvoie un nouveau lien, et l'ancien ne fonctionne plus", async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);
      const ancien = jetonRecu(donnees.courriel);

      await renvoyer(donnees.courriel).expect(202);
      const nouveau = jetonRecu(donnees.courriel);

      expect(nouveau).not.toBe(ancien);
      await verifier(ancien).expect(400);
      await verifier(nouveau).expect(200);
    });

    it("répond pareil pour un courriel inconnu, sans rien envoyer (202)", async () => {
      const inconnu = `inconnu-${randomUUID()}@exemple.ca`;
      await renvoyer(inconnu).expect(202);
      boiteCourriels.assertNotSent({ to: inconnu });
    });
  });

  describe('Connexion', () => {
    it('ouvre une session et pose deux cookies httpOnly', async () => {
      const { courriel, motDePasse } = await compteVerifie();
      const res = await connecter(courriel, motDePasse).expect(200);

      const poses = cookies(res);
      expect(poses.find((c) => c.startsWith('relnis_acces='))).toMatch(/HttpOnly/);
      expect(poses.find((c) => c.startsWith('relnis_renouvellement='))).toMatch(/HttpOnly/);
      // Les jetons ne sont jamais dans le corps de la réponse.
      expect(JSON.stringify(res.body)).not.toMatch(/jeton/i);

      const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
        where: { courriel },
        include: { sessions: true },
      });
      expect(utilisateur.sessions).toHaveLength(1);
      expect(utilisateur.derniereConnexion).not.toBeNull();
    });

    it('donne accès à /moi avec le cookie, et seulement avec lui', async () => {
      const { courriel, motDePasse } = await compteVerifie();
      const navigateur = request.agent(app.getHttpServer()); // garde les cookies, comme un navigateur

      await navigateur.get('/api/v1/auth/moi').expect(401);
      await navigateur
        .post('/api/v1/auth/connexion')
        .set(SANS_LIMITE)
        .send({ courriel, motDePasse })
        .expect(200);

      const res = await navigateur.get('/api/v1/auth/moi').expect(200);
      expect(res.body.courriel).toBe(courriel);
      expect(res.body.entreprise.nom).toBe('Plomberie Test');
      expect(res.body).not.toHaveProperty('motDePasseHache');
    });

    it('refuse un mauvais mot de passe et un courriel inconnu avec le même code (401)', async () => {
      const { courriel } = await compteVerifie();

      const mauvais = await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      const inconnu = await connecter(`inconnu-${randomUUID()}@exemple.ca`, 'peu-importe-ici').expect(401);
      expect(mauvais.body.code).toBe('IDENTIFIANTS_INVALIDES');
      expect(inconnu.body.code).toBe('IDENTIFIANTS_INVALIDES');
    });

    it('refuse un courriel pas encore vérifié (403)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);

      const res = await connecter(donnees.courriel, donnees.motDePasse).expect(403);
      expect(res.body.code).toBe('COURRIEL_NON_VERIFIE');
    });

    it('refuse un jeton d’accès falsifié (401)', async () => {
      const res = await serveur()
        .get('/api/v1/auth/moi')
        .set('Cookie', 'relnis_acces=un.jeton.invente')
        .expect(401);
      expect(res.body.code).toBe('NON_AUTHENTIFIE');
    });
  });

  describe('Renouvellement et déconnexion', () => {
    it("renouvelle : nouveau jeton d'accès et nouveau jeton de renouvellement (rotation)", async () => {
      const { jeton } = await sessionOuverte();

      const res = await renouveler(jeton).expect(200);
      const nouveauJeton = valeurCookie(res, 'relnis_renouvellement');
      const nouvelAcces = valeurCookie(res, 'relnis_acces');

      expect(nouveauJeton).toBeTruthy();
      expect(nouveauJeton).not.toBe(jeton);
      // Le nouveau jeton d'accès ouvre bien les routes protégées.
      await serveur()
        .get('/api/v1/auth/moi')
        .set('Cookie', `relnis_acces=${nouvelAcces}`)
        .expect(200);
    });

    it("délai de grâce : l'ancien jeton juste après la rotation donne un accès, sans nouvelle rotation", async () => {
      const { courriel, jeton } = await sessionOuverte();
      await renouveler(jeton).expect(200); // un premier onglet fait la rotation

      const res = await renouveler(jeton).expect(200); // un second onglet, au même moment
      expect(valeurCookie(res, 'relnis_acces')).toBeTruthy();
      expect(valeurCookie(res, 'relnis_renouvellement')).toBeUndefined();
      expect((await sessionDe(courriel)).fermeeLe).toBeNull();
    });

    it("ferme la session si un ancien jeton resservait après le délai (vol probable)", async () => {
      const { courriel, jeton: ancien } = await sessionOuverte();
      const res = await renouveler(ancien).expect(200);
      const nouveau = valeurCookie(res, 'relnis_renouvellement') ?? '';

      // On fait comme si la rotation datait d'une minute.
      await prisma.session.updateMany({
        where: { utilisateur: { courriel } },
        data: { renouveleeLe: new Date(Date.now() - 60_000) },
      });

      const refus = await renouveler(ancien).expect(401);
      expect(refus.body.code).toBe('SESSION_INVALIDE');
      const session = await sessionDe(courriel);
      expect(session.fermeeLe).not.toBeNull();
      expect(session.motifFermeture).toBe('REUTILISATION_DETECTEE');
      // Même le jeton le plus récent ne fonctionne plus : la personne doit se reconnecter.
      await renouveler(nouveau).expect(401);
    });

    it('refuse une session inactive depuis plus de 7 jours', async () => {
      const { courriel, jeton } = await sessionOuverte();
      await prisma.session.updateMany({
        where: { utilisateur: { courriel } },
        data: { expireLe: new Date(Date.now() - 1000) },
      });
      await renouveler(jeton).expect(401);
    });

    it('refuse une session ouverte depuis plus de 30 jours, même active', async () => {
      const { courriel, jeton } = await sessionOuverte();
      await prisma.session.updateMany({
        where: { utilisateur: { courriel } },
        data: { expireAbsoluLe: new Date(Date.now() - 1000) },
      });
      await renouveler(jeton).expect(401);
    });

    it('refuse le renouvellement si le compte a été désactivé', async () => {
      const { courriel, jeton } = await sessionOuverte();
      await prisma.utilisateur.update({ where: { courriel }, data: { actif: false } });
      await renouveler(jeton).expect(401);
    });

    it('refuse un renouvellement sans cookie, et efface les cookies', async () => {
      const res = await serveur()
        .post('/api/v1/auth/renouveler')
        .set(SANS_LIMITE)
        .expect(401);
      expect(res.body.code).toBe('SESSION_INVALIDE');
      expect(cookies(res).some((c) => c.startsWith('relnis_acces=;'))).toBe(true);
    });

    it('déconnexion : ferme la session et efface les cookies', async () => {
      const { courriel, jeton } = await sessionOuverte();

      const res = await serveur()
        .post('/api/v1/auth/deconnexion')
        .set('Cookie', `relnis_renouvellement=${jeton}`)
        .expect(204);

      // Un cookie vide qui expire en 1970 : le navigateur le supprime.
      expect(cookies(res).find((c) => c.startsWith('relnis_acces='))).toMatch(/1970/);
      expect(cookies(res).find((c) => c.startsWith('relnis_renouvellement='))).toMatch(/1970/);
      const session = await sessionDe(courriel);
      expect(session.motifFermeture).toBe('DECONNEXION');
      await renouveler(jeton).expect(401);
    });
  });

  describe('Protections', () => {
    it("refuse une requête qui modifie des données si elle vient d'un autre site (CSRF, 403)", async () => {
      const res = await serveur()
        .post('/api/v1/auth/connexion')
        .set(SANS_LIMITE)
        .set('Origin', 'https://site-pirate.example')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ courriel: 'marie@exemple.ca', motDePasse: 'peu-importe-ici' })
        .expect(403);
      expect(res.body.code).toBe('ACCES_REFUSE');
    });

    it('ajoute les en-têtes de sécurité et cache la technologie du serveur', async () => {
      const res = await serveur().get('/api/v1/auth/moi');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Limites', () => {
    it('bloque le compte après 5 mots de passe ratés, même avec le bon ensuite (429)', async () => {
      const { courriel, motDePasse } = await compteVerifie();

      for (let essai = 1; essai <= 5; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      }
      const res = await connecter(courriel, motDePasse).expect(429);
      expect(res.body.code).toBe('COMPTE_BLOQUE_TEMPORAIREMENT');
    });

    it('oublie les échecs après une connexion réussie', async () => {
      const { courriel, motDePasse } = await compteVerifie();

      for (let essai = 1; essai <= 4; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      }
      await connecter(courriel, motDePasse).expect(200);
      // Le compteur est reparti de zéro : un nouvel échec ne bloque pas.
      await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      await connecter(courriel, motDePasse).expect(200);
    });

    it("n'envoie pas deux liens de vérification en moins d'une minute", async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201); // 1er courriel

      await renvoyer(donnees.courriel).expect(202); // 2e courriel
      await renvoyer(donnees.courriel).expect(202); // ignoré, même réponse

      expect(boiteCourriels.filter({ to: donnees.courriel })).toHaveLength(2);
    });

    it("limite les demandes d'une même adresse IP (429)", async () => {
      // Sans l'en-tête de test : la vraie limite s'applique (3 par 15 min sur cette route).
      const demander = () =>
        serveur()
          .post('/api/v1/auth/renvoyer-verification')
          .send({ courriel: `ip-${randomUUID()}@exemple.ca` });

      for (let essai = 1; essai <= 3; essai++) {
        await demander().expect(202);
      }
      const res = await demander().expect(429);
      expect(res.body.code).toBe('TROP_DE_DEMANDES');
    });
  });
});
