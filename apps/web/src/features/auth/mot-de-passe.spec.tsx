import { screen } from '@testing-library/react'
import { afficherApp, repondre, simulerApi } from '@/test/outils'
import { prechargerSolidite } from './solidite-mot-de-passe'

// On observe le préchargement des dictionnaires sans changer le reste du module.
vi.mock('./solidite-mot-de-passe', async (original) => ({
  ...(await original<typeof import('./solidite-mot-de-passe')>()),
  prechargerSolidite: vi.fn(),
}))

const NOUVEAU = 'POST /auth/nouveau-mot-de-passe'

describe('mot de passe oublié', () => {
  it('réponse 202 sans corps : message de réussite (et non « erreur inattendue »)', async () => {
    simulerApi({ 'POST /auth/mot-de-passe-oublie': () => repondre(202) })
    const { utilisateur } = afficherApp('/mot-de-passe-oublie')

    await utilisateur.type(await screen.findByLabelText('Courriel'), 'marie@plomberie-tremblay.ca')
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer le lien' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Si un compte existe pour cette adresse')
    expect(screen.getByRole('button', { name: 'Envoyer le lien' })).toBeDisabled() // attente d'une minute
  })
})

describe('nouveau mot de passe', () => {
  it('sans jeton : « lien non valide », sans télécharger les dictionnaires', async () => {
    simulerApi()
    afficherApp('/nouveau-mot-de-passe')

    expect(await screen.findByRole('heading', { name: 'Lien non valide' })).toBeInTheDocument()
    expect(prechargerSolidite).not.toHaveBeenCalled()
  })

  it('avec un jeton : formulaire, dictionnaires préchargés dès l’ouverture', async () => {
    simulerApi()
    afficherApp('/nouveau-mot-de-passe?jeton=abc')

    expect(await screen.findByLabelText('Nouveau mot de passe')).toBeInTheDocument()
    expect(prechargerSolidite).toHaveBeenCalled()
  })

  it('mot de passe refusé par l’API : message sous le champ, le lien reste utilisable', async () => {
    let refus = true
    const api = simulerApi({
      [NOUVEAU]: () => (refus ? repondre(400, { code: 'MOT_DE_PASSE_TROP_FAIBLE' }) : repondre(200, {})),
    })
    const { utilisateur } = afficherApp('/nouveau-mot-de-passe?jeton=abc')

    await utilisateur.type(await screen.findByLabelText('Nouveau mot de passe'), 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))
    expect(await screen.findByText(/Ce mot de passe est trop facile à deviner/)).toBeInTheDocument()

    refus = false
    await utilisateur.clear(screen.getByLabelText('Nouveau mot de passe'))
    await utilisateur.type(screen.getByLabelText('Nouveau mot de passe'), 'tuyau-raccord-vanne-solide')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))

    expect(await screen.findByRole('heading', { name: 'Mot de passe modifié' })).toBeInTheDocument()
    expect(api.dernierCorps(NOUVEAU)).toEqual({ jeton: 'abc', motDePasse: 'tuyau-raccord-vanne-solide' })
  })

  it('lien expiré : on propose d’en demander un nouveau', async () => {
    simulerApi({ [NOUVEAU]: () => repondre(400, { code: 'JETON_EXPIRE' }) })
    const { utilisateur } = afficherApp('/nouveau-mot-de-passe?jeton=abc')

    await utilisateur.type(await screen.findByLabelText('Nouveau mot de passe'), 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))

    expect(await screen.findByRole('link', { name: 'Demander un nouveau lien' })).toBeInTheDocument()
  })
})
