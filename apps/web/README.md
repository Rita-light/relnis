# @relnis/web

L'interface web de Relnis : React 19 et TypeScript (mode strict), construite avec Vite.

Pour la présentation du projet et l'installation, voir le [README principal](../../README.md).

## Lancer et vérifier

Toutes les commandes se lancent **depuis la racine du dépôt** :

| Commande | Rôle |
| --- | --- |
| `npm run dev -w @relnis/web` | Lance l'interface sur <http://localhost:5173>, avec mise à jour instantanée à chaque modification |
| `npm run lint -w @relnis/web` | Vérification du code avec oxlint |
| `npm run build -w @relnis/web` | Vérifie les types, puis construit le site dans `dist/` |
| `npm run preview -w @relnis/web` | Affiche le site construit, tel qu'il sera mis en ligne |

## Organisation

| Dossier ou fichier | Contenu |
| --- | --- |
| `src/components/ui/` | Composants shadcn/ui (Base UI + Tailwind), copiés dans le projet et modifiables |
| `src/locales/` | Traductions : `fr.json` (langue par défaut) et `en.json` |
| `src/i18n.ts` | Configuration des langues (react-i18next) |
| `src/index.css` | Thème Atlantic Pulse : couleurs du mode clair et du mode sombre |
| `public/` | Logo, icônes et manifeste, servis tels quels à la racine du site |

## Règles

**Textes** : aucun texte écrit en dur dans les composants. Chaque texte a une clé dans `src/locales/fr.json` et `en.json`, et s'affiche avec `t('ecran.cle')`. TypeScript signale une clé qui n'existe pas.

**Couleurs** : toujours par leur rôle, jamais par leur code.

| Classe | Usage |
| --- | --- |
| `variant="action"` | Orange : **une seule** action principale par écran (texte Nuit) |
| `bg-primary` / variante par défaut | Océan : boutons et éléments actifs |
| `text-lien` | Liens et petit texte de couleur Océan (Océan foncé, lisible sur Brume) |
| `bg-ia`, `text-ia-foreground` | Violet : fonctions d'IA et analyses |
| `bg-succes`, `bg-alerte`, `bg-erreur`, `bg-info` | États, toujours avec une icône et un texte (l'alerte est ambre, pas orange) |

**Accessibilité** : tout doit fonctionner au clavier ; chaque champ a une étiquette ; une image a un texte alternatif (`alt=""` si elle est décorative).

**Imports** : `@/` désigne le dossier `src` (ex. `import { Button } from '@/components/ui/button'`).
