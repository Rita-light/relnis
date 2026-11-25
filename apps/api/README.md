# @relnis/api

API REST de Relnis : NestJS 12, TypeScript strict, ES Modules, Prisma 7 + PostgreSQL.

Installation : voir le [README principal](../../README.md). Commandes à lancer depuis la racine.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run start:dev -w @relnis/api` | API sur <http://localhost:3000> |
| `npm run test -w @relnis/api` / `test:e2e` | Tests unitaires / de bout en bout (base locale requise) |
| `npm run db:migrate -w @relnis/api -- --name <nom>` | Nouvelle migration |
| `npm run db:generate -w @relnis/api` | Régénère le client Prisma après un changement du schéma |
| `npm run db:studio -w @relnis/api` | Voir les tables |

## Adresses

- `/api/v1/…` : toutes les routes (liste complète dans Swagger).
- `/api/v1/sante` : état de l'API et de la base.
- `/api/docs` : Swagger, désactivé en production.

## Règles

- Erreurs au format `{ code, message, details }` : `throw new ErreurApi(statut, 'CODE', 'message')`.
- Données reçues validées par un DTO ; un champ non prévu est refusé.
- Courriels : modèles dans `src/courriels/modeles` (layout commun) ; en local, Mailpit les affiche sur <http://localhost:8025>.
- ESM : imports relatifs en `.js`. Tests avec Vitest (`vi.fn()`).
