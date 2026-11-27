import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Un PrismaService branché sur une autre adresse que celle du .env. */
const connexionVers = (adresse: string) =>
  new PrismaService({ getOrThrow: () => adresse } as unknown as ConfigService);

// Rôles PostgreSQL de l'API : chacun n'a que les droits dont il a besoin.
describe('Rôles de la base (e2e)', () => {
  let config: ConfigService;
  let app: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()], // lit .env, comme l'API
      providers: [PrismaService],
    }).compile();
    config = module.get(ConfigService);
    app = module.get(PrismaService);
    await app.onModuleInit();
  });

  afterAll(() => app.onModuleDestroy());

  it("refuse de démarrer si l'API reçoit le propriétaire (il ignorerait le RLS)", async () => {
    const mauvaisReglage = connexionVers(
      config.getOrThrow<string>('DATABASE_URL_MIGRATION'),
    );

    await expect(mauvaisReglage.onModuleInit()).rejects.toThrow(
      /DATABASE_URL : le rôle .* ne convient pas/,
    );
    await mauvaisReglage.$disconnect();
  });

  it('refuse aussi un membre du propriétaire (il pourrait désactiver le RLS)', async () => {
    // Rôle jetable : relnis_app n'est jamais touché, les autres tests tournent en même temps.
    const proprietaire = new URL(
      config.getOrThrow<string>('DATABASE_URL_MIGRATION'),
    );
    const admin = new PrismaClient({
      adapter: new PrismaPg({ connectionString: proprietaire.href }),
    });
    const membre = new URL(proprietaire);
    membre.username = 'relnis_test_membre';
    membre.password = 'relnis_test';
    const mauvaisReglage = connexionVers(membre.href);
    try {
      await admin.$executeRawUnsafe('DROP ROLE IF EXISTS relnis_test_membre');
      await admin.$executeRawUnsafe(
        `CREATE ROLE relnis_test_membre LOGIN PASSWORD 'relnis_test' IN ROLE "${proprietaire.username}"`,
      );

      await expect(mauvaisReglage.onModuleInit()).rejects.toThrow(
        /membre de ce rôle/,
      );
    } finally {
      await mauvaisReglage.$disconnect();
      await admin.$executeRawUnsafe('DROP ROLE IF EXISTS relnis_test_membre');
      await admin.$disconnect();
    }
  });

  it("relnis_app ne lit ni les jetons ni les sessions (réservés à l'authentification)", async () => {
    await expect(app.jeton.count()).rejects.toThrow(/permission denied/);
    await expect(app.session.count()).rejects.toThrow(/permission denied/);
  });

  it('relnis_app ne supprime rien (on archive)', async () => {
    await expect(
      app.utilisateur.deleteMany({
        where: { courriel: 'personne@exemple.ca' },
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
