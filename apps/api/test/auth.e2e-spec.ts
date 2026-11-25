import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurerApp } from '../src/configurer-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
  const inscrire = (donnees: object) =>
    serveur().post('/api/v1/auth/inscription').send(donnees);
  const verifier = (jeton: string) =>
    serveur().post('/api/v1/auth/verifier-courriel').send({ jeton });
  const renvoyer = (courriel: string) =>
    serveur().post('/api/v1/auth/renvoyer-verification').send({ courriel });

  // Lit le jeton dans le dernier courriel reçu par cette adresse.
  const jetonRecu = (courriel: string) =>
    boiteCourriels
      .assertSent({ to: courriel })
      .link('/verifier-courriel')
      .searchParams.get('jeton') ?? '';

  const connecter = (courriel: string, motDePasse: string) =>
    serveur().post('/api/v1/auth/connexion').send({ courriel, motDePasse });

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
});
