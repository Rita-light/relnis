import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  CHAMP_TOTAL,
  champBlocage,
  cleEchecs,
  MAX_ECHECS_TOTAL,
} from '../src/auth/auth.service.js';
import { configurerApp } from '../src/configurer-app.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaSystemeService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

// Désactive la limite par adresse IP (seulement quand NODE_ENV=test), sauf dans les tests de limites.
const SANS_LIMITE = { 'x-test-sans-limite': '1' };

// Tests de bout en bout : vraie API + vraie base. Les courriels restent en mémoire (aucun envoi).
describe('Authentification (e2e)', () => {
  let app: INestApplication<App>;
  // Propriétaire des tables : prépare et nettoie les données de test (l'API n'a pas ces droits).
  let prisma: PrismaClient;
  // Le client qu'utilise l'authentification (pour l'espionner).
  let systeme: PrismaSystemeService;
  let redis: RedisService;
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

  // Lit le jeton dans le dernier courriel de vérification reçu par cette adresse.
  // vi.waitFor réessaie un court moment : certains courriels partent en arrière-plan.
  const jetonRecu = (courriel: string) =>
    vi.waitFor(
      () =>
        boiteCourriels
          .assertSent({ to: courriel, subject: /confirmez/i })
          .link('/verifier-courriel')
          .searchParams.get('jeton') ?? '',
    );

  // Attend que cette adresse ait reçu exactement « nombre » courriels.
  const attendreCourriels = (courriel: string, nombre: number) =>
    vi.waitFor(() =>
      expect(boiteCourriels.filter({ to: courriel })).toHaveLength(nombre),
    );

  const connecter = (courriel: string, motDePasse: string) =>
    envoyer('/api/v1/auth/connexion', { courriel, motDePasse });

  // Crée un compte au courriel vérifié, prêt à se connecter.
  const compteVerifie = async () => {
    const donnees = nouvelleInscription();
    await inscrire(donnees).expect(201);
    await verifier(await jetonRecu(donnees.courriel)).expect(200);
    return donnees;
  };

  // Les cookies posés par une réponse, sous forme de tableau de chaînes.
  const cookies = (res: {
    headers: Record<string, string | string[] | undefined>;
  }) => ([] as string[]).concat(res.headers['set-cookie'] ?? []);

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

  // Un compte vérifié et connecté : son courriel, ses jetons de renouvellement et d'accès.
  const sessionOuverte = async () => {
    const { courriel, motDePasse } = await compteVerifie();
    const res = await connecter(courriel, motDePasse).expect(200);
    return {
      courriel,
      jeton: valeurCookie(res, 'relnis_renouvellement') ?? '',
      acces: valeurCookie(res, 'relnis_acces') ?? '',
    };
  };

  // Appelle /moi avec un jeton d'accès précis (comme un navigateur avec ce cookie).
  const moi = (acces: string) =>
    serveur().get('/api/v1/auth/moi').set('Cookie', `relnis_acces=${acces}`);

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
    systeme = app.get(PrismaSystemeService);
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: app
          .get(ConfigService)
          .getOrThrow<string>('DATABASE_URL_MIGRATION'),
      }),
    });

    // Repart de compteurs vides. Sécurité : seulement sur la base Redis n° 15 des tests.
    expect(process.env.REDIS_URL).toMatch(/\/15$/);
    redis = app.get(RedisService);
    await redis.flushdb();
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
    await prisma.$disconnect();
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
      expect(utilisateur.motDePasseHache).toMatch(
        /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/,
      );
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

    it('refuse un mot de passe facile à deviner, sans rien créer (400)', async () => {
      const donnees = { ...nouvelleInscription(), motDePasse: '1234567891011' };
      const res = await inscrire(donnees).expect(400);

      expect(res.body.code).toBe('MOT_DE_PASSE_TROP_FAIBLE');
      expect(
        await prisma.utilisateur.count({
          where: { courriel: donnees.courriel },
        }),
      ).toBe(0);
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

      await verifier(await jetonRecu(donnees.courriel)).expect(200);

      const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
        where: { id: res.body.utilisateurId },
      });
      expect(utilisateur.courrielVerifie).toBe(true);
    });

    it('refuse un jeton déjà utilisé (400)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);
      const jeton = await jetonRecu(donnees.courriel);

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
      const jeton = await jetonRecu(donnees.courriel);

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
      const ancien = await jetonRecu(donnees.courriel);

      await renvoyer(donnees.courriel).expect(202);
      await attendreCourriels(donnees.courriel, 2); // envoyé en arrière-plan
      const nouveau = await jetonRecu(donnees.courriel);

      expect(nouveau).not.toBe(ancien);
      await verifier(ancien).expect(400);
      await verifier(nouveau).expect(200);
    });

    it('répond pareil pour un courriel inconnu, sans rien envoyer (202)', async () => {
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
      expect(poses.find((c) => c.startsWith('relnis_acces='))).toMatch(
        /HttpOnly/,
      );
      expect(poses.find((c) => c.startsWith('relnis_renouvellement='))).toMatch(
        /HttpOnly/,
      );
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

      const mauvais = await connecter(
        courriel,
        'pas-le-bon-mot-de-passe',
      ).expect(401);
      const inconnu = await connecter(
        `inconnu-${randomUUID()}@exemple.ca`,
        'peu-importe-ici',
      ).expect(401);
      expect(mauvais.body.code).toBe('IDENTIFIANTS_INVALIDES');
      expect(inconnu.body.code).toBe('IDENTIFIANTS_INVALIDES');
    });

    it('refuse un courriel pas encore vérifié (403)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);

      const res = await connecter(donnees.courriel, donnees.motDePasse).expect(
        403,
      );
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

    it('ferme la session si un ancien jeton resservait après le délai (vol probable)', async () => {
      const { courriel, jeton: ancien, acces } = await sessionOuverte();
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
      // Et le jeton d'accès en cours est refusé tout de suite (le voleur pourrait l'avoir aussi).
      await moi(acces).expect(401);
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
      await prisma.utilisateur.update({
        where: { courriel },
        data: { actif: false },
      });
      await renouveler(jeton).expect(401);
    });

    it('refuse un renouvellement sans cookie, et efface les cookies', async () => {
      const res = await serveur()
        .post('/api/v1/auth/renouveler')
        .set(SANS_LIMITE)
        .expect(401);
      expect(res.body.code).toBe('SESSION_INVALIDE');
      expect(cookies(res).some((c) => c.startsWith('relnis_acces=;'))).toBe(
        true,
      );
    });

    it('déconnexion : ferme la session et efface les cookies', async () => {
      const { courriel, jeton } = await sessionOuverte();

      const res = await serveur()
        .post('/api/v1/auth/deconnexion')
        .set('Cookie', `relnis_renouvellement=${jeton}`)
        .expect(204);

      // Un cookie vide qui expire en 1970 : le navigateur le supprime.
      expect(cookies(res).find((c) => c.startsWith('relnis_acces='))).toMatch(
        /1970/,
      );
      expect(
        cookies(res).find((c) => c.startsWith('relnis_renouvellement=')),
      ).toMatch(/1970/);
      const session = await sessionDe(courriel);
      expect(session.motifFermeture).toBe('DECONNEXION');
      await renouveler(jeton).expect(401);
    });

    it("après la déconnexion, l'ancien cookie d'accès est refusé tout de suite (pas dans 15 min)", async () => {
      const { jeton, acces } = await sessionOuverte();
      await moi(acces).expect(200);

      await serveur()
        .post('/api/v1/auth/deconnexion')
        .set('Cookie', `relnis_renouvellement=${jeton}`)
        .expect(204);

      await moi(acces).expect(401);
    });

    it("la déconnexion avec l'ancien jeton (deux onglets) ferme aussi la session", async () => {
      const { courriel, jeton: ancien } = await sessionOuverte();
      await renouveler(ancien).expect(200); // l'autre onglet a fait la rotation

      await serveur()
        .post('/api/v1/auth/deconnexion')
        .set('Cookie', `relnis_renouvellement=${ancien}`)
        .expect(204);

      expect((await sessionDe(courriel)).motifFermeture).toBe('DECONNEXION');
    });
  });

  describe('Mot de passe oublié', () => {
    const demander = (courriel: string) =>
      envoyer('/api/v1/auth/mot-de-passe-oublie', { courriel });
    const reinitialiser = (jeton: string, motDePasse: string) =>
      envoyer('/api/v1/auth/nouveau-mot-de-passe', { jeton, motDePasse });

    // Lit le jeton dans le dernier courriel « mot de passe » (envoyé en arrière-plan : on l'attend).
    const jetonMotDePasse = (courriel: string) =>
      vi.waitFor(
        () =>
          boiteCourriels
            .assertSent({ to: courriel, subject: /mot de passe/i })
            .link('/nouveau-mot-de-passe')
            .searchParams.get('jeton') ?? '',
      );

    it('envoie un lien, change le mot de passe, et seul le nouveau fonctionne', async () => {
      const { courriel, motDePasse } = await compteVerifie();
      await demander(courriel).expect(202);

      await reinitialiser(
        await jetonMotDePasse(courriel),
        'un-tout-nouveau-mot-de-passe',
      ).expect(200);

      await connecter(courriel, motDePasse).expect(401);
      await connecter(courriel, 'un-tout-nouveau-mot-de-passe').expect(200);
    });

    it("ferme toutes les sessions ouvertes, et leurs cookies d'accès sont refusés tout de suite", async () => {
      const { courriel, jeton, acces } = await sessionOuverte();
      await demander(courriel).expect(202);
      await reinitialiser(
        await jetonMotDePasse(courriel),
        'un-tout-nouveau-mot-de-passe',
      ).expect(200);

      await renouveler(jeton).expect(401);
      await moi(acces).expect(401);
      expect((await sessionDe(courriel)).motifFermeture).toBe(
        'MOT_DE_PASSE_CHANGE',
      );
    });

    it('une connexion en cours ne survit pas à une réinitialisation simultanée', async () => {
      const { courriel, motDePasse } = await compteVerifie();
      const lire = systeme.utilisateur.findUnique.bind(systeme.utilisateur);
      // Juste après la lecture par la connexion, une réinitialisation change le mot de passe.
      const espion = vi
        .spyOn(systeme.utilisateur, 'findUnique')
        .mockImplementationOnce((async (args: Parameters<typeof lire>[0]) => {
          const lu = await lire(args);
          await prisma.utilisateur.update({
            where: { courriel },
            data: { motDePasseHache: 'remplace-par-la-reinitialisation' },
          });
          return lu;
        }) as never);

      const res = await connecter(courriel, motDePasse).expect(401);
      expect(espion).toHaveBeenCalled(); // la simulation a bien eu lieu
      espion.mockRestore();

      expect(res.body.code).toBe('IDENTIFIANTS_INVALIDES');
      expect(
        await prisma.session.count({ where: { utilisateur: { courriel } } }),
      ).toBe(0);
    });

    it('refuse un lien déjà utilisé, ou expiré (400)', async () => {
      const { courriel } = await compteVerifie();
      await demander(courriel).expect(202);
      const jeton = await jetonMotDePasse(courriel);

      await reinitialiser(jeton, 'un-tout-nouveau-mot-de-passe').expect(200);
      const reutilise = await reinitialiser(
        jeton,
        'encore-un-autre-mot-de-passe',
      ).expect(400);
      expect(reutilise.body.code).toBe('JETON_INVALIDE');

      // Un autre compte, dont le lien a vieilli d'une heure.
      const autre = await compteVerifie();
      await demander(autre.courriel).expect(202);
      const jetonAutre = await jetonMotDePasse(autre.courriel);
      await prisma.jeton.updateMany({
        where: {
          utilisateur: { courriel: autre.courriel },
          type: 'MOT_DE_PASSE',
        },
        data: { expireLe: new Date(Date.now() - 1000) },
      });
      const expire = await reinitialiser(
        jetonAutre,
        'un-tout-nouveau-mot-de-passe',
      ).expect(400);
      expect(expire.body.code).toBe('JETON_EXPIRE');
    });

    it('refuse un jeton de vérification de courriel à la place (pas le même usage)', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);

      const res = await reinitialiser(
        await jetonRecu(donnees.courriel),
        'un-tout-nouveau-mot-de-passe',
      ).expect(400);
      expect(res.body.code).toBe('JETON_INVALIDE');
    });

    it('refuse un nouveau mot de passe trop court (400)', async () => {
      const { courriel } = await compteVerifie();
      await demander(courriel).expect(202);

      const res = await reinitialiser(
        await jetonMotDePasse(courriel),
        'court',
      ).expect(400);
      expect(res.body.details.champs).toHaveProperty('motDePasse');
    });

    it('refuse un mot de passe tiré du nom de la personne, et le lien reste utilisable (400)', async () => {
      const { courriel } = await compteVerifie(); // Marie Tremblay
      await demander(courriel).expect(202);
      const jeton = await jetonMotDePasse(courriel);

      const res = await reinitialiser(jeton, 'Tremblay2026!').expect(400);
      expect(res.body.code).toBe('MOT_DE_PASSE_TROP_FAIBLE');
      await reinitialiser(jeton, 'un-tout-nouveau-mot-de-passe').expect(200);
    });

    it('répond pareil pour un courriel inconnu, sans rien envoyer (202)', async () => {
      const inconnu = `inconnu-${randomUUID()}@exemple.ca`;
      await demander(inconnu).expect(202);
      boiteCourriels.assertNotSent({ to: inconnu });
    });

    it('débloque un compte bloqué par trop d’échecs', async () => {
      const { courriel } = await compteVerifie();
      for (let essai = 1; essai <= 5; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      }
      await demander(courriel).expect(202);
      await reinitialiser(
        await jetonMotDePasse(courriel),
        'un-tout-nouveau-mot-de-passe',
      ).expect(200);

      await connecter(courriel, 'un-tout-nouveau-mot-de-passe').expect(200);
    });

    it('confirme aussi le courriel d’un compte pas encore vérifié', async () => {
      const donnees = nouvelleInscription();
      await inscrire(donnees).expect(201);
      await demander(donnees.courriel).expect(202);

      await reinitialiser(
        await jetonMotDePasse(donnees.courriel),
        'un-tout-nouveau-mot-de-passe',
      ).expect(200);
      await connecter(donnees.courriel, 'un-tout-nouveau-mot-de-passe').expect(
        200,
      );
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
    it('bloque cette adresse IP après 5 mots de passe ratés, même avec le bon ensuite (429)', async () => {
      const { courriel, motDePasse } = await compteVerifie();

      for (let essai = 1; essai <= 5; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      }
      const res = await connecter(courriel, motDePasse).expect(429);
      expect(res.body.code).toBe('COMPTE_BLOQUE_TEMPORAIREMENT');
    });

    it("des échecs venus d'une AUTRE adresse IP ne bloquent pas la vraie personne", async () => {
      const { courriel, motDePasse } = await compteVerifie();
      // Un attaquant a raté 5 fois depuis son adresse, qui est donc bloquée (écrit directement dans Redis).
      await redis.hset(cleEchecs(courriel), {
        '203.0.113.7': 5,
        'bloque:203.0.113.7': Date.now() + 15 * 60_000,
        [CHAMP_TOTAL]: 5,
      });

      await connecter(courriel, motDePasse).expect(200);
    });

    it('bloque le compte pour tout le monde après 20 échecs, toutes adresses confondues', async () => {
      const { courriel, motDePasse } = await compteVerifie();
      // Attaque répartie : 19 échecs déjà venus d'autres adresses, le 20e arrive d'ici.
      await redis.hset(cleEchecs(courriel), CHAMP_TOTAL, MAX_ECHECS_TOTAL - 1);
      await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);

      const res = await connecter(courriel, motDePasse).expect(429);
      expect(res.body.code).toBe('COMPTE_BLOQUE_TEMPORAIREMENT');
    });

    it('le blocage dure 15 min à partir du seuil, même si le 1er échec est ancien', async () => {
      const { courriel } = await compteVerifie();
      const cle = cleEchecs(courriel);
      for (let essai = 1; essai <= 4; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401);
      }
      // Le compteur de cette IP n'a plus que 2 s (fenêtre presque finie).
      const ip =
        (await redis.hkeys(cle)).find((champ) => champ !== CHAMP_TOTAL) ?? '';
      await redis.hpexpire(cle, 2000, 'FIELDS', 1, ip);

      await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401); // 5e échec
      const [restant] = await redis.hpttl(cle, 'FIELDS', 1, champBlocage(ip));
      expect(restant).toBeGreaterThan(14 * 60_000); // ~15 min, pas 2 s
    });

    it("un blocage ne prolonge pas les compteurs d'une autre adresse IP", async () => {
      const { courriel } = await compteVerifie();
      const cle = cleEchecs(courriel);
      // Une autre adresse : 2 échecs, qui expirent dans 2 s.
      await redis.hset(cle, '198.51.100.9', 2);
      await redis.hpexpire(cle, 2000, 'FIELDS', 1, '198.51.100.9');

      for (let essai = 1; essai <= 5; essai++) {
        await connecter(courriel, 'pas-le-bon-mot-de-passe').expect(401); // bloque CETTE IP
      }
      const [restant] = await redis.hpttl(cle, 'FIELDS', 1, '198.51.100.9');
      expect(restant).toBeLessThanOrEqual(2000); // toujours 2 s au plus
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

      await attendreCourriels(donnees.courriel, 2);
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
