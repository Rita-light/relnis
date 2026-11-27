import { screen } from '@testing-library/react'
import { afficherApp, MARIE, repondre, simulerApi } from '@/test/outils'

describe('écran de connexion', () => {
  it('formulaire vide : un message sous chaque champ, aucun appel à l’API', async () => {
    const api = simulerApi()
    const { utilisateur } = afficherApp('/connexion')

    await utilisateur.click(await screen.findByRole('button', { name: 'Se connecter' }))

    expect(await screen.findAllByText('Ce champ est obligatoire.')).toHaveLength(2)
    expect(screen.getByLabelText('Courriel')).toHaveFocus() // le premier champ en erreur reçoit le focus
    expect(api.nombre('POST /auth/connexion')).toBe(0)
  })

  it('identifiants refusés : le message de l’API, annoncé aux lecteurs d’écran', async () => {
    simulerApi({ 'POST /auth/connexion': () => repondre(401, { code: 'IDENTIFIANTS_INVALIDES' }) })
    const { utilisateur } = afficherApp('/connexion')

    await utilisateur.type(await screen.findByLabelText('Courriel'), MARIE.courriel)
    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'pas-le-bon')
    await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Courriel ou mot de passe incorrect.')
  })

  it('courriel non vérifié : lien pour recevoir un nouveau lien de confirmation', async () => {
    simulerApi({ 'POST /auth/connexion': () => repondre(403, { code: 'COURRIEL_NON_VERIFIE' }) })
    const { utilisateur, routeur } = afficherApp('/connexion')

    await utilisateur.type(await screen.findByLabelText('Courriel'), MARIE.courriel)
    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }))
    await utilisateur.click(await screen.findByRole('link', { name: 'Recevoir un nouveau lien de confirmation' }))

    expect(routeur.state.location.pathname).toBe('/courriel-envoye')
    expect(await screen.findByText(MARIE.courriel)).toBeInTheDocument() // l'adresse est reprise
  })

  it('connexion réussie : direction l’accueil', async () => {
    let connectee = false
    const api = simulerApi({
      'POST /auth/connexion': () => {
        connectee = true
        return repondre(200, {})
      },
      'GET /auth/moi': () => (connectee ? repondre(200, MARIE) : repondre(401, { code: 'NON_AUTHENTIFIE' })),
    })
    const { utilisateur } = afficherApp('/connexion')

    await utilisateur.type(await screen.findByLabelText('Courriel'), `  ${MARIE.courriel} `)
    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Bonjour Marie' })).toBeInTheDocument()
    expect(api.dernierCorps('POST /auth/connexion')).toEqual({
      courriel: MARIE.courriel, // espaces retirés, comme le fait l'API
      motDePasse: 'cheval-pile-agrafe-correct',
    })
  })
})
