# @relnis/web

Interface web de Relnis : React 19, TypeScript strict, Vite, Tailwind CSS, shadcn/ui.

Installation : voir le [README principal](../../README.md). Commandes à lancer depuis la racine.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev -w @relnis/web` | Interface sur <http://localhost:5173> |
| `npm run build -w @relnis/web` | Vérifie les types et construit le site |

## Règles

- **Textes** : jamais en dur ; une clé dans `src/locales/fr.json` et `en.json`, affichée avec `t('ecran.cle')`.
- **Couleurs** (`src/index.css`) : `variant="action"` (orange) une seule fois par écran ; `text-lien` pour les liens ; `bg-ia` pour l'IA ; `bg-succes`, `bg-alerte`, `bg-erreur`, `bg-info` toujours avec une icône.
- **Accessibilité** : clavier, étiquettes sur les champs, `alt` sur les images.
- **Imports** : `@/` = `src/`.
