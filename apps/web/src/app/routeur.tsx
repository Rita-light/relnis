import { createBrowserRouter } from 'react-router'
import { Accueil } from '@/features/accueil/accueil'
import { Connexion } from '@/features/auth/connexion'
import { CourrielEnvoye } from '@/features/auth/courriel-envoye'
import { Inscription } from '@/features/auth/inscription'
import { MiseEnPageAuth } from '@/features/auth/mise-en-page-auth'
import { MotDePasseOublie } from '@/features/auth/mot-de-passe-oublie'
import { NouveauMotDePasse } from '@/features/auth/nouveau-mot-de-passe'
import { VerifierCourriel } from '@/features/auth/verifier-courriel'
import { PageIntrouvable } from './page-introuvable'
import { RoutePrivee, RouteVisiteur } from './session/routes-gardees'

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
  {
    element: <RoutePrivee />,
    children: [{ path: '/', element: <Accueil /> }],
  },
  { path: '*', element: <PageIntrouvable /> },
])
