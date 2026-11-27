import { screen } from '@testing-library/react'
import { afficherApp, repondre, simulerApi } from '@/test/outils'

const VERIFIER = 'POST /auth/verifier-courriel'

describe('lien de confirmation du courriel', () => {
  it('envoie le jeton une seule fois, même en StrictMode (le jeton ne sert qu’une fois)', async () => {
    const api = simulerApi({ [VERIFIER]: () => repondre(200, { courrielVerifie: true }) })
    afficherApp('/verifier-courriel?jeton=abc')

    expect(await screen.findByRole('heading', { name: 'Courriel confirmé' })).toBeInTheDocument()
    expect(api.nombre(VERIFIER)).toBe(1)
    expect(api.dernierCorps(VERIFIER)).toEqual({ jeton: 'abc' })
  })

  it('lien déjà utilisé : on propose un nouveau lien', async () => {
    simulerApi({ [VERIFIER]: () => repondre(400, { code: 'JETON_INVALIDE' }) })
    afficherApp('/verifier-courriel?jeton=abc')

    expect(await screen.findByRole('alert')).toHaveTextContent("Ce lien n'est pas valide ou a déjà servi.")
    expect(screen.getByRole('link', { name: 'Recevoir un nouveau lien' })).toBeInTheDocument()
  })

  it('sans jeton : « lien non valide » sans appeler l’API', async () => {
    const api = simulerApi()
    afficherApp('/verifier-courriel')

    expect(await screen.findByRole('heading', { name: 'Confirmation impossible' })).toBeInTheDocument()
    expect(api.nombre(VERIFIER)).toBe(0)
  })

  it('API indisponible : « Réessayer » (le jeton est peut-être encore bon)', async () => {
    let disponible = false
    const api = simulerApi({
      [VERIFIER]: () => (disponible ? repondre(200, {}) : repondre(503, { code: 'SERVICE_INDISPONIBLE' })),
    })
    const { utilisateur } = afficherApp('/verifier-courriel?jeton=abc')

    const reessayer = await screen.findByRole('button', { name: 'Réessayer' }) // 1er envoi refusé (503)
    disponible = true
    await utilisateur.click(reessayer)

    expect(await screen.findByRole('heading', { name: 'Courriel confirmé' })).toBeInTheDocument()
    expect(api.nombre(VERIFIER)).toBe(2)
  })
})
