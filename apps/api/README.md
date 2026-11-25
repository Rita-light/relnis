# @relnis/api

Le serveur de Relnis : une API REST construite avec NestJS 12, en TypeScript (mode strict) et en ES Modules.

Pour la présentation du projet et l'installation, voir le [README principal](../../README.md).

## Lancer et tester

Toutes les commandes se lancent **depuis la racine du dépôt** :

| Commande | Rôle |
| --- | --- |
| `npm run start:dev -w @relnis/api` | Lance l'API sur <http://localhost:3000>, avec redémarrage à chaque modification |
| `npm run test -w @relnis/api` | Tests unitaires (fichiers `*.spec.ts`, à côté du code) |
| `npm run test:e2e -w @relnis/api` | Tests de bout en bout (dossier `test/`) |
| `npm run lint -w @relnis/api` | Vérification du code avec oxlint |
| `npm run format -w @relnis/api` | Mise en forme du code avec Prettier |
| `npm run build -w @relnis/api` | Compilation dans `dist/` |

## Base de données (Prisma 7)

Réglages dans `.env` (copie de `.env.example`). PostgreSQL tourne avec `docker compose up -d`.

| Commande | Rôle |
| --- | --- |
| `npm run db:migrate -w @relnis/api -- --name <nom>` | Crée une migration à partir de `prisma/schema.prisma` et l'applique |
| `npm run db:generate -w @relnis/api` | Régénère le client (`src/generated/prisma`, hors de Git) après chaque modification du schéma |
| `npm run db:deploy -w @relnis/api` | Applique les migrations existantes (CI, préproduction, production) |
| `npm run db:studio -w @relnis/api` | Ouvre Prisma Studio pour voir les tables (base locale seulement) |

Dans le code, `PrismaService` (module global) donne accès à la base : il suffit de le demander dans un constructeur.

## Adresses

- `/api/v1/...` : toutes les routes. Le préfixe et la version sont réglés dans `src/configurer-app.ts`, utilisé à la fois par `main.ts` et par les tests de bout en bout.
- `/api/v1/sante` : 200 si l'API et la base répondent, 503 sinon (utilisée par l'hébergeur et la surveillance).
- `/api/docs` : la documentation Swagger (JSON sur `/api/docs-json`). Active si `NODE_ENV` n'est pas `production`, ou si `SWAGGER_ENABLED=true` (préproduction).

## À savoir

- **ES Modules** : les imports relatifs se terminent par `.js`, même dans un fichier `.ts` (ex. `import { AppModule } from './app.module.js'`). `__dirname` n'existe pas : utiliser `import.meta.dirname`.
- **Tests** : Vitest. Les simulations s'écrivent avec `vi.fn()`.
- **Organisation** : un module NestJS par module de l'analyse (articles, mouvements, comptages, etc.). Chaque module a son contrôleur, son service et ses DTO.
