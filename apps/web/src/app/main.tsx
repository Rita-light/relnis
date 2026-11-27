import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import '../index.css'
import '@/i18n/i18n'
import './theme'
import { routes } from './routes'
import { FournisseurSession } from './session/fournisseur-session'

// Routeur du navigateur (barre d'adresse) ; les tests montent les mêmes routes en mémoire.
const routeur = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FournisseurSession>
      <RouterProvider router={routeur} />
    </FournisseurSession>
  </StrictMode>,
)
