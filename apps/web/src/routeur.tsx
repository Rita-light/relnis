import { createBrowserRouter } from 'react-router'
import { MiseEnPageAuth } from '@/components/mise-en-page-auth'
import { Accueil } from '@/pages/accueil'
import { Connexion } from '@/pages/connexion'
import { PageIntrouvable } from '@/pages/page-introuvable'
import { RoutePrivee, RouteVisiteur } from '@/session/routes-gardees'

// Chaque page est rangée sous la garde qui la protège.
export const routeur = createBrowserRouter([
  {
    element: <RouteVisiteur />,
    children: [
      {
        element: <MiseEnPageAuth />,
        children: [{ path: '/connexion', element: <Connexion /> }],
      },
    ],
  },
  {
    element: <RoutePrivee />,
    children: [{ path: '/', element: <Accueil /> }],
  },
  { path: '*', element: <PageIntrouvable /> },
])
