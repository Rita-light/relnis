import { screen } from '@testing-library/react'
import { afficherApp, MARIE, repondre, simulerApi } from '@/test/outils'

describe('session et gardes de routes', () => {
  it('sans session, une page privée renvoie vers la connexion', async () => {
    simulerApi() // GET /auth/moi → 401
    const { routeur } = afficherApp('/')

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/connexion')
  })

  it('avec une session, la page privée s’affiche', async () => {
    simulerApi({ 'GET /auth/moi': () => repondre(200, MARIE) })
    afficherApp('/')
    expect(await screen.findByRole('heading', { name: 'Bonjour Marie' })).toBeInTheDocument()
  })

  it('API indisponible au démarrage : écran « Service indisponible », pas une déconnexion', async () => {
    let disponible = false
    simulerApi({
      'GET /auth/moi': () => (disponible ? repondre(200, MARIE) : repondre(503, { code: 'SERVICE_INDISPONIBLE' })),
    })
    const { routeur, utilisateur } = afficherApp('/')

    expect(await screen.findByRole('heading', { name: 'Service indisponible' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/') // on n'a pas été renvoyé vers la connexion

    disponible = true
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { name: 'Bonjour Marie' })).toBeInTheDocument()
  })

  it('connexion réussie mais profil illisible : « indisponible », sans revenir au formulaire', async () => {
    let connectee = false
    simulerApi({
      'POST /auth/connexion': () => {
        connectee = true
        return repondre(200, {})
      },
      'GET /auth/moi': () =>
        connectee ? repondre(503, { code: 'SERVICE_INDISPONIBLE' }) : repondre(401, { code: 'NON_AUTHENTIFIE' }),
    })
    const { utilisateur } = afficherApp('/connexion')

    await utilisateur.type(await screen.findByLabelText('Courriel'), MARIE.courriel)
    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Service indisponible' })).toBeInTheDocument()
  })

  it('une personne connectée qui ouvre la connexion repart vers l’accueil', async () => {
    simulerApi({ 'GET /auth/moi': () => repondre(200, MARIE) })
    const { routeur } = afficherApp('/connexion')

    expect(await screen.findByRole('heading', { name: 'Bonjour Marie' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/')
  })
})
