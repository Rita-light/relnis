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
});
