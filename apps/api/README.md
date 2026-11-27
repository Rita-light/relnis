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

## Base de données : un rôle par usage

| Variable | Rôle PostgreSQL | Pour |
| --- | --- | --- |
| `DATABASE_URL` | `relnis_app` | Toute l'API (`PrismaService`) ; soumis à l'isolation entre entreprises ; aucun `DELETE` |
| `DATABASE_URL_SYSTEME` | `relnis_systeme` | L'authentification seulement (`PrismaSystemeService`, fourni par `AuthModule`) |
| `DATABASE_URL_MIGRATION` | `relnis` (propriétaire) | Les migrations et les tests (préparation, nettoyage) |

L'API refuse de démarrer si un rôle n'est pas celui attendu, est superutilisateur, propriétaire des tables (ou membre de ce rôle) ou mal réglé pour le RLS. Les rôles et leurs droits sont créés par les migrations, sans mot de passe ; `db:roles-dev` ouvre leur connexion en local. Hors local, le compte de migration doit pouvoir créer des rôles (`CREATEROLE`).

## Règles

- Toutes les routes exigent d'être connecté (cookie `relnis_acces`), sauf celles marquées `@Publique()`.
- Données d'une entreprise : toujours lues et écrites dans `prisma.avecEntreprise(utilisateur.entrepriseId, (tx) => …)`. Nouvelle table : colonne `entreprise_id`, RLS activé et forcé, politique filtrant par `entreprise_courante()` (`USING` et `WITH CHECK`), `GRANT SELECT, INSERT, UPDATE` à `relnis_app` (jamais `DELETE`). Sinon le test de garde (`test/isolation.e2e-spec.ts`) échoue.
- Erreurs au format `{ code, message, details }` : `throw new ErreurApi(statut, 'CODE', 'message')`.
- Données reçues validées par un DTO ; un champ non prévu est refusé.
- Courriels : modèles dans `src/courriels/modeles` (layout commun) ; en local, Mailpit les affiche sur <http://localhost:8025>.
- ESM : imports relatifs en `.js`. Tests avec Vitest (`vi.fn()`).
