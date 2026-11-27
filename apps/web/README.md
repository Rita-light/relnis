# @relnis/web

Interface web de Relnis : React 19, TypeScript strict, Vite, Tailwind CSS, shadcn/ui.

Installation : voir le [README principal](../../README.md). Commandes à lancer depuis la racine.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev -w @relnis/web` | Interface sur <http://localhost:5173> (`/api` est relayé vers l'API sur le port 3000 : lancer l'API aussi) |
| `npm run build -w @relnis/web` | Vérifie les types et construit le site |

## Organisation (`src/`)

| Dossier | Contenu |
| --- | --- |
| `app/` | Démarrage, routeur, session, écrans globaux (chargement, page introuvable…) |
| `features/<fonctionnalité>/` | Pages et composants d'une seule fonctionnalité (`auth`, `accueil`…) |
| `shared/` | Ce que plusieurs fonctionnalités utilisent : `ui/` (shadcn, généré), `components/`, `lib/` |
| `i18n/` | Configuration des langues et textes (`locales/`) |

Un fichier vit dans sa fonctionnalité ; il monte dans `shared/` seulement quand une deuxième fonctionnalité en a besoin. Une fonctionnalité n'importe pas l'intérieur d'une autre. Dossiers à plat tant qu'ils restent petits. Tests à côté du fichier testé (`*.spec.tsx`).

## Règles

- **Textes** : jamais en dur ; une clé dans `src/i18n/locales/fr.json` et `en.json`, affichée avec `t('ecran.cle')`.
- **Documents légaux** : trop longs pour `fr.json`, ils sont dans `src/features/legal/documents.fr.ts` et `.en.ts` (même forme imposée par le type).
- **Langues** : en ajouter une = une ligne dans `src/i18n/langues.ts` + un fichier `src/i18n/locales/xx.json` (+ ses documents légaux).
- **Couleurs** (`src/index.css`) : `variant="action"` (orange) une seule fois par écran ; `text-lien` pour les liens ; `bg-ia` pour l'IA ; `bg-succes`, `bg-alerte`, `bg-erreur`, `bg-info` toujours avec une icône.
- **Accessibilité** : clavier, étiquettes sur les champs, `alt` sur les images.
- **Imports** : `@/` = `src/`.
