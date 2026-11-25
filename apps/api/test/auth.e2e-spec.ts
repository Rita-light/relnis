import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurerApp } from '../src/configurer-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Tests de bout en bout : vraie API + vraie base (Docker en local, base jetable dans le CI).
describe('Inscription (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
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

  // Envoie une requête d'inscription à l'API de test.
  const inscrire = (donnees: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/inscription').send(donnees);

  // Démarre l'API une fois pour tous les tests du fichier, avec les mêmes réglages que main.ts.
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
    await prisma.utilisateur.deleteMany({
      where: { id: { in: utilisateurs.map((u) => u.id) } },
    });
    await prisma.entreprise.deleteMany({
      where: { id: { in: utilisateurs.map((u) => u.entrepriseId) } },
    });
    await app.close();
  });

  it("crée l'entreprise et son administrateur, mot de passe haché", async () => {
    const donnees = nouvelleInscription();
    const res = await inscrire(donnees).expect(201);

    const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
      where: { id: res.body.utilisateurId },
    });
    expect(utilisateur.entrepriseId).toBe(res.body.entrepriseId);
    expect(utilisateur.role).toBe('ADMINISTRATEUR');
    expect(utilisateur.motDePasseHache).not.toBe(donnees.motDePasse);
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

  it("refuse un champ non prévu, ex. se donner un rôle (400)", async () => {
    const res = await inscrire({
      ...nouvelleInscription(),
      role: 'COMPTABLE',
    }).expect(400);

    expect(res.body.code).toBe('DONNEES_INVALIDES');
  });
});
