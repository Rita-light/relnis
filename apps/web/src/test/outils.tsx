// Outils partagés par les tests de l'interface.
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'
import type { Utilisateur } from '@/app/session/contexte-session'
import { FournisseurSession } from '@/app/session/fournisseur-session'

// Pages chargées d'avance : sinon le 1er test de chaque fichier attend leur compilation (plus d'une seconde).
// Un échec est ignoré ici : le test qui ouvre cette page le verra par le routeur.
const precharger = (liste: RouteObject[]): Promise<unknown> =>
  Promise.all(
    liste.map(async (route) => {
      if (typeof route.lazy === 'function') await route.lazy().catch(() => {})
      await precharger(route.children ?? [])
    }),
  )
await precharger(routes)

/** Une réponse de l'API, avec un corps JSON (ou sans corps). */
export const repondre = (statut: number, corps?: unknown) =>
  new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: corps === undefined ? undefined : { 'Content-Type': 'application/json' },
  })

/** Profil renvoyé par GET /auth/moi dans les tests. */
export const MARIE: Utilisateur = {
  id: 'u-1',
  prenom: 'Marie',
  nom: 'Tremblay',
  courriel: 'marie@plomberie-tremblay.ca',
  role: 'ADMINISTRATEUR',
  langue: 'fr',
  theme: 'SYSTEME',
  entreprise: { id: 'e-1', nom: 'Plomberie Tremblay' },
}

type Gestionnaire = (corps: unknown) => Response | Promise<Response>

/**
 * Remplace fetch par une fausse API : clé « MÉTHODE /chemin » (sans /api/v1) → réponse.
 * Par défaut : pas de session (GET /auth/moi et le renouvellement répondent 401).
 */
export function simulerApi(routesApi: Record<string, Gestionnaire> = {}) {
  const gestionnaires: Record<string, Gestionnaire> = {
    'GET /auth/moi': () => repondre(401, { code: 'NON_AUTHENTIFIE' }),
    'POST /auth/renouveler': () => repondre(401, { code: 'SESSION_INVALIDE' }),
    ...routesApi,
  }
  const appels: { cle: string; corps: unknown }[] = []

  const fetchSimule = vi.fn(async (url: string, init?: RequestInit) => {
    const cle = `${init?.method ?? 'GET'} ${url.replace('/api/v1', '')}`
    const corps: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    appels.push({ cle, corps })
    const gestionnaire = gestionnaires[cle]
    return gestionnaire ? gestionnaire(corps) : repondre(404, { code: 'INTROUVABLE' })
  })
  vi.stubGlobal('fetch', fetchSimule)

  return {
    /** Nombre d'appels à une route, ex. nombre('POST /auth/inscription'). */
    nombre: (cle: string) => appels.filter((a) => a.cle === cle).length,
    /** Corps envoyé au dernier appel de cette route. */
    dernierCorps: (cle: string) => appels.findLast((a) => a.cle === cle)?.corps,
  }
}

/** Monte toute l'application (session + vraies routes) à l'adresse donnée, en StrictMode comme main.tsx. */
export function afficherApp(adresse: string) {
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(
    <StrictMode>
      <FournisseurSession>
        <RouterProvider router={routeur} />
      </FournisseurSession>
    </StrictMode>,
  )
  return { routeur, utilisateur: userEvent.setup() }
}
