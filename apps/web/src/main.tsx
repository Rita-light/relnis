import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import './i18n'
import './theme'
import { routeur } from './routeur'
import { FournisseurSession } from './session/fournisseur-session'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FournisseurSession>
      <RouterProvider router={routeur} />
    </FournisseurSession>
  </StrictMode>,
)
