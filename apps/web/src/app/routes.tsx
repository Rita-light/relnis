import { Outlet, ScrollRestoration, type RouteObject } from 'react-router'
import type { NomDocument } from '@/features/legal/documents'
import { Chargement } from './chargement'
import { ErreurApplication } from './erreur-application'
import { PageIntrouvable } from './page-introuvable'
import { RoutePrivee, RouteVisiteur } from './session/routes-gardees'

// Chaque page est un fichier à part, téléchargé à sa première ouverture (et non au démarrage).
// lazy en forme fonction : la forme objet est vidée après usage et ne servirait qu'au premier routeur.
const miseEnPageAuth = async () => ({ Component: (await import('@/features/auth/mise-en-page-auth')).MiseEnPageAuth })
const pageLegale = (document: NomDocument) => async () => {
  const { PageLegale } = await import('@/features/legal/page-legale')
  return { element: <PageLegale document={document} /> }
}

// Chaque page est rangée sous la garde qui la protège (main.tsx et les tests montent ces routes).
export const routes: RouteObject[] = [
  {
    // Racine : une nouvelle page s'ouvre en haut ; le retour arrière retrouve la position d'avant.
    element: (
      <>
        <Outlet />
        <ScrollRestoration />
      </>
    ),
    hydrateFallbackElement: <Chargement />, // pendant le téléchargement de la première page
    errorElement: <ErreurApplication />, // page qui plante ou fichier introuvable
    children: [
      {
        element: <RouteVisiteur />,
        children: [
          {
            lazy: miseEnPageAuth,
            children: [
              {
                path: '/connexion',
                lazy: async () => ({ Component: (await import('@/features/auth/connexion')).Connexion }),
              },
              {
                path: '/inscription',
                lazy: async () => ({ Component: (await import('@/features/auth/inscription')).Inscription }),
              },
              {
                path: '/courriel-envoye',
                lazy: async () => ({ Component: (await import('@/features/auth/courriel-envoye')).CourrielEnvoye }),
              },
              {
                path: '/mot-de-passe-oublie',
                lazy: async () => ({
                  Component: (await import('@/features/auth/mot-de-passe-oublie')).MotDePasseOublie,
                }),
              },
            ],
          },
        ],
      },
      // Liens reçus par courriel : ouverts qu'on soit connecté ou non.
      {
        lazy: miseEnPageAuth,
        children: [
          {
            path: '/verifier-courriel',
            lazy: async () => ({ Component: (await import('@/features/auth/verifier-courriel')).VerifierCourriel }),
          },
          {
            path: '/nouveau-mot-de-passe',
            lazy: async () => ({
              Component: (await import('@/features/auth/nouveau-mot-de-passe')).NouveauMotDePasse,
            }),
          },
        ],
      },
      // Pages légales : publiques (on doit pouvoir les lire avant de créer un compte).
      { path: '/conditions', lazy: pageLegale('conditions') },
      { path: '/confidentialite', lazy: pageLegale('confidentialite') },
      {
        element: <RoutePrivee />,
        children: [
          { path: '/', lazy: async () => ({ Component: (await import('@/features/accueil/accueil')).Accueil }) },
        ],
      },
      { path: '*', element: <PageIntrouvable /> },
    ],
  },
]
