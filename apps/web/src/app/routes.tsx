import { Outlet, ScrollRestoration, type RouteObject } from 'react-router'
import { Accueil } from '@/features/accueil/accueil'
import { Connexion } from '@/features/auth/connexion'
import { CourrielEnvoye } from '@/features/auth/courriel-envoye'
import { Inscription } from '@/features/auth/inscription'
import { MiseEnPageAuth } from '@/features/auth/mise-en-page-auth'
import { MotDePasseOublie } from '@/features/auth/mot-de-passe-oublie'
import { NouveauMotDePasse } from '@/features/auth/nouveau-mot-de-passe'
import { VerifierCourriel } from '@/features/auth/verifier-courriel'
import { PageLegale } from '@/features/legal/page-legale'
import { PageIntrouvable } from './page-introuvable'
import { RoutePrivee, RouteVisiteur } from './session/routes-gardees'

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
    children: [
      {
        element: <RouteVisiteur />,
        children: [
          {
            element: <MiseEnPageAuth />,
            children: [
              { path: '/connexion', element: <Connexion /> },
              { path: '/inscription', element: <Inscription /> },
              { path: '/courriel-envoye', element: <CourrielEnvoye /> },
              { path: '/mot-de-passe-oublie', element: <MotDePasseOublie /> },
            ],
          },
        ],
      },
      // Liens reçus par courriel : ouverts qu'on soit connecté ou non.
      {
        element: <MiseEnPageAuth />,
        children: [
          { path: '/verifier-courriel', element: <VerifierCourriel /> },
          { path: '/nouveau-mot-de-passe', element: <NouveauMotDePasse /> },
        ],
      },
      // Pages légales : publiques (on doit pouvoir les lire avant de créer un compte).
      { path: '/conditions', element: <PageLegale document="conditions" /> },
      { path: '/confidentialite', element: <PageLegale document="confidentialite" /> },
      {
        element: <RoutePrivee />,
        children: [{ path: '/', element: <Accueil /> }],
      },
      { path: '*', element: <PageIntrouvable /> },
    ],
  },
]
