import { randomUUID } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * Tables qui échappent à l'isolation : lisibles par relnis_app ou portant entreprise_id, sans RLS
 * activé et forcé, sans politique, ou avec une politique qui ne filtre pas par entreprise_courante().
 * Chaque politique compte : elles s'additionnent (OU), une seule trop large ouvre toute la table.
 * Heuristique (lecture du texte) : les tests de comportement restent la preuve.
 */
const tablesNonProtegees = async (client: Prisma.TransactionClient) =>
  (
    await client.$queryRaw<{ nom: string }[]>`
      SELECT c.relname AS nom
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND (has_table_privilege('relnis_app', c.oid, 'SELECT')
          OR EXISTS (SELECT FROM pg_attribute a
                     WHERE a.attrelid = c.oid AND a.attname = 'entreprise_id' AND NOT a.attisdropped))
        AND NOT (c.relrowsecurity AND c.relforcerowsecurity
          AND EXISTS (SELECT FROM pg_policy p WHERE p.polrelid = c.oid)
          AND NOT EXISTS (SELECT FROM pg_policy p WHERE p.polrelid = c.oid AND (
            pg_get_expr(p.polqual, p.polrelid) NOT LIKE '%entreprise_courante()%'
            OR pg_get_expr(p.polwithcheck, p.polrelid) NOT LIKE '%entreprise_courante()%')))
      ORDER BY 1`
  ).map((table) => table.nom);

// Isolation entre entreprises (RLS) : depuis l'entreprise A, rien de B ne se voit ni ne se touche.
describe('Isolation entre entreprises (e2e)', () => {
  let config: ConfigService;
  let app: PrismaService; // relnis_app, comme l'API
  let proprietaire: PrismaClient; // prépare et nettoie (échappe au RLS en local et en CI)
  const suffixe = randomUUID();
  const ids = { a: '', b: '', utilisateurA: '', utilisateurB: '' };

  const nouvelUtilisateur = (entrepriseId: string, lettre: string) => ({
    entrepriseId,
    prenom: 'Test',
    nom: lettre,
    courriel: `isolation-${lettre}-${suffixe}@exemple.ca`,
    motDePasseHache: 'sans-objet',
    role: 'ADMINISTRATEUR' as const,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [PrismaService],
    }).compile();
    config = module.get(ConfigService);
    app = module.get(PrismaService);
    await app.onModuleInit();
    proprietaire = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL_MIGRATION'),
      }),
    });

    for (const lettre of ['a', 'b'] as const) {
      const entreprise = await proprietaire.entreprise.create({
        data: { nom: `Isolation ${lettre.toUpperCase()}` },
      });
      const utilisateur = await proprietaire.utilisateur.create({
        data: nouvelUtilisateur(entreprise.id, lettre),
      });
      ids[lettre] = entreprise.id;
      ids[lettre === 'a' ? 'utilisateurA' : 'utilisateurB'] = utilisateur.id;
    }
  });

  afterAll(async () => {
    await proprietaire.utilisateur.deleteMany({
      where: { courriel: { endsWith: `-${suffixe}@exemple.ca` } },
    });
    await proprietaire.entreprise.deleteMany({
      where: {
        OR: [{ id: { in: [ids.a, ids.b] } }, { nom: `Intruse ${suffixe}` }],
      },
    });
    await proprietaire.$disconnect();
    await app.onModuleDestroy();
  });

  const lesDeux = () => ({
    utilisateurs: { id: { in: [ids.utilisateurA, ids.utilisateurB] } },
    entreprises: { id: { in: [ids.a, ids.b] } },
  });

  it('A ne lit que ses propres lignes', async () => {
    const vu = await app.avecEntreprise(ids.a, async (tx) => ({
      utilisateurs: await tx.utilisateur.findMany({
        where: lesDeux().utilisateurs,
        select: { id: true },
      }),
      entreprises: await tx.entreprise.findMany({
        where: lesDeux().entreprises,
        select: { id: true },
      }),
      utilisateurB: await tx.utilisateur.findUnique({
        where: { id: ids.utilisateurB },
      }),
    }));

    expect(vu.utilisateurs).toEqual([{ id: ids.utilisateurA }]);
    expect(vu.entreprises).toEqual([{ id: ids.a }]);
    expect(vu.utilisateurB).toBeNull();
  });

  it('A ne modifie rien chez B', async () => {
    const modifies = await app.avecEntreprise(ids.a, (tx) =>
      tx.utilisateur.updateMany({
        where: { id: ids.utilisateurB },
        data: { prenom: 'Pirate' },
      }),
    );

    expect(modifies.count).toBe(0);
    const b = await proprietaire.utilisateur.findUniqueOrThrow({
      where: { id: ids.utilisateurB },
    });
    expect(b.prenom).toBe('Test');
  });

  // createMany et updateMany : sans RETURNING, seul WITH CHECK bloque l'écriture (create et update
  // seraient aussi bloqués par la règle de lecture, ce qui masquerait un WITH CHECK manquant).
  it('A ne crée rien chez B', async () => {
    await expect(
      app.avecEntreprise(ids.a, (tx) =>
        tx.utilisateur.createMany({
          data: [nouvelUtilisateur(ids.b, 'intrus')],
        }),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      app.avecEntreprise(ids.a, (tx) =>
        tx.entreprise.createMany({ data: [{ nom: `Intruse ${suffixe}` }] }),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('A ne déplace pas une de ses lignes vers B', async () => {
    await expect(
      app.avecEntreprise(ids.a, (tx) =>
        tx.utilisateur.updateMany({
          where: { id: ids.utilisateurA },
          data: { entrepriseId: ids.b },
        }),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('sans entreprise choisie, aucune ligne (fermé par défaut)', async () => {
    expect(await app.utilisateur.count({ where: lesDeux().utilisateurs })).toBe(
      0,
    );
    expect(await app.entreprise.count({ where: lesDeux().entreprises })).toBe(
      0,
    );
  });

  it("l'entreprise choisie s'efface à la fin de la transaction (connexion réutilisée)", async () => {
    // Une seule connexion : la requête suivante passe forcément par celle de la transaction.
    const uneConnexion = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        max: 1,
      }),
    });
    const avecEntreprise = PrismaService.prototype.avecEntreprise.bind(
      uneConnexion as unknown as PrismaService,
    );
    try {
      const pendant = await avecEntreprise(ids.a, (tx) =>
        tx.utilisateur.count({ where: lesDeux().utilisateurs }),
      );
      const apres = await uneConnexion.utilisateur.count({
        where: lesDeux().utilisateurs,
      });

      expect(pendant).toBe(1);
      expect(apres).toBe(0);
    } finally {
      await uneConnexion.$disconnect();
    }
  });

  it('chaque table de relnis_app ou portant entreprise_id est protégée par le RLS', async () => {
    expect(await tablesNonProtegees(proprietaire)).toEqual([]);
  });

  it('le test de garde repère une table oubliée ou une politique trop large', async () => {
    // Tables créées puis annulées (ROLLBACK) : les autres tests ne les voient jamais.
    const avecRls = (table: string) =>
      `CREATE TABLE ${table} (entreprise_id uuid);
       ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
       ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`;
    const bonne = 'USING (entreprise_id = entreprise_courante())';
    const pieges = [
      'CREATE TABLE test_garde_sans_rls (entreprise_id uuid)',
      `${avecRls('test_garde_large')} CREATE POLICY p ON test_garde_large USING (true)`,
      // Bonne politique, mais une seconde l'annule (les politiques s'additionnent).
      `${avecRls('test_garde_doublee')} CREATE POLICY p ON test_garde_doublee ${bonne};
       CREATE POLICY rapport ON test_garde_doublee FOR SELECT USING (true)`,
      // Correcte : ne doit pas être signalée.
      `${avecRls('test_garde_correcte')} CREATE POLICY p ON test_garde_correcte ${bonne}`,
    ];
    const annuler = new Error('annuler');
    let reperees: string[] = [];
    await expect(
      proprietaire.$transaction(async (tx) => {
        for (const sql of pieges.flatMap((bloc) => bloc.split(';'))) {
          if (sql.trim()) await tx.$executeRawUnsafe(sql);
        }
        reperees = await tablesNonProtegees(tx);
        throw annuler;
      }),
    ).rejects.toBe(annuler);

    expect(reperees).toEqual([
      'test_garde_doublee',
      'test_garde_large',
      'test_garde_sans_rls',
    ]);
  });
});
