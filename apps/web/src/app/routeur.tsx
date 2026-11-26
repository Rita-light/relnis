import { createBrowserRouter } from 'react-router'
import { MiseEnPageAuth } from '@/features/auth/mise-en-page-auth'
import { Accueil } from '@/features/accueil/accueil'
import { Connexion } from '@/features/auth/connexion'
import { CourrielEnvoye } from '@/features/auth/courriel-envoye'
import { Inscription } from '@/features/auth/inscription'
import { PageIntrouvable } from '@/app/page-introuvable'
import { VerifierCourriel } from '@/features/auth/verifier-courriel'
import { RoutePrivee, RouteVisiteur } from '@/app/session/routes-gardees'

// Chaque page est rangée sous la garde qui la protège.
export const routeur = createBrowserRouter([
  {
    element: <RouteVisiteur />,
    children: [
      {
        element: <MiseEnPageAuth />,
        children: [
          { path: '/connexion', element: <Connexion /> },
          { path: '/inscription', element: <Inscription /> },
          { path: '/courriel-envoye', element: <CourrielEnvoye /> },
        ],
      },
    ],
  },
  // Liens reçus par courriel : ouverts qu'on soit connecté ou non.
  {
    element: <MiseEnPageAuth />,
    children: [{ path: '/verifier-courriel', element: <VerifierCourriel /> }],
  },
  {
    element: <RoutePrivee />,
    children: [{ path: '/', element: <Accueil /> }],
  },
  { path: '*', element: <PageIntrouvable /> },
])
