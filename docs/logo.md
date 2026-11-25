# Logo Relnis — piste « Caisse »

Symbole choisi le 23 novembre 2026 : un R dont la boucle est une caisse avec sa poignée (le stock), et dont la patte part vers l'avant (le mouvement). Pas de nom écrit : le symbole est le visage de la marque.

## Les fichiers

| Fichier | À quoi il sert |
| --- | --- |
| `favicon.svg` | Icône de l'onglet du navigateur (dessin vectoriel, net à toutes les tailles) |
| `favicon.ico` | Icône de l'onglet pour les vieux navigateurs (16, 32 et 48 px ; en 16 px, la poignée est retirée pour rester net) |
| `apple-touch-icon.png` | Icône quand on ajoute l'app à l'écran d'accueil d'un iPhone (180 px, carré plein : iOS arrondit lui-même les coins) |
| `icon-192.png`, `icon-512.png` | Icônes de l'app installée (Android, ordinateur) |
| `manifest.webmanifest` | Fiche de l'app pour le navigateur : nom, couleurs, icônes |
| `relnis-logo-clair.svg` | Logo seul, pour un fond clair (tige et patte Nuit, caisse orange) |
| `relnis-logo-fonce.svg` | Logo seul, pour un fond foncé ou le mode sombre (tige et patte Brume, caisse orange) |
| `relnis-logo-nuit.svg` | Logo en une seule couleur, Nuit (impression noir et blanc, tampon) |
| `relnis-logo-blanc.svg` | Logo en une seule couleur, blanc (sur une photo ou un fond très foncé) |

La poignée est un vrai trou dans la caisse : le logo marche sur n'importe quel fond.

## Où ils sont

Tous les fichiers sont dans `apps/web/public/`. Vite les sert tels quels à la racine du site (ex. `/favicon.svg`).

Ils sont déclarés dans `apps/web/index.html`, dans la balise `<head>` :

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#15364D">
```

Dans l'interface React (menu de gauche, écrans de connexion), utiliser `relnis-logo-fonce.svg` sur le fond Nuit et `relnis-logo-clair.svg` sur un fond clair, avec un texte alternatif : `<img src="/relnis-logo-fonce.svg" alt="Relnis">`. Si le nom « Relnis » est déjà écrit juste à côté, mettre `alt=""` (image décorative), pour qu'un lecteur d'écran ne l'annonce pas deux fois.

## Règles d'utilisation

- Garder un espace libre autour du logo, au moins le quart de sa largeur.
- Ne pas l'étirer, le pencher, l'ombrer ni changer ses couleurs en dehors des versions ci-dessus.
- Taille minimale : 16 px.
- Couleurs : Nuit `#15364D`, Brume `#F3F6FA`, Orange `#FF874B` (palette Atlantic Pulse).
- L'orange du logo est la seule exception à la règle « un seul élément orange par écran » : le logo n'est pas un bouton.

## À faire avant de l'adopter pour de bon

- Vérifier avec Google Lens qu'aucun logo existant ne lui ressemble trop.
- Plus tard, avant de déposer la marque : recherche par image dans la base des marques de l'OPIC (codes de Vienne).
