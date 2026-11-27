import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afficherApp, repondre, simulerApi } from '@/test/outils'

const INSCRIPTION = 'POST /auth/inscription'

/** Remplit le formulaire d'inscription, mot de passe au choix, conditions acceptées. */
async function remplir(utilisateur: UserEvent, motDePasse: string) {
  await utilisateur.type(await screen.findByLabelText("Nom de l'entreprise"), 'Plomberie Tremblay')
  await utilisateur.type(screen.getByLabelText('Prénom'), 'Marie')
  await utilisateur.type(screen.getByLabelText('Nom'), 'Tremblay')
  await utilisateur.type(screen.getByLabelText('Courriel'), 'marie@plomberie-tremblay.ca')
  await utilisateur.type(screen.getByLabelText('Mot de passe'), motDePasse)
  await utilisateur.click(screen.getByRole('checkbox'))
}

const envoyer = (utilisateur: UserEvent) => utilisateur.click(screen.getByRole('button', { name: 'Créer mon compte' }))

describe("écran d'inscription", () => {
  it('conditions non acceptées : message sous la case, aucun envoi', async () => {
    const api = simulerApi()
    const { utilisateur } = afficherApp('/inscription')

    await remplir(utilisateur, 'cheval-pile-agrafe-correct')
    await utilisateur.click(screen.getByRole('checkbox')) // décoche
    await envoyer(utilisateur)

    expect(await screen.findByText('Vous devez accepter pour créer votre compte.')).toBeInTheDocument()
    expect(api.nombre(INSCRIPTION)).toBe(0)
  })

  it('mot de passe facile à deviner : jauge, message, et refus sans appel à l’API', async () => {
    const api = simulerApi()
    const { utilisateur } = afficherApp('/inscription')

    await remplir(utilisateur, '1234567891011')
    expect(await screen.findByText(/Solidité : faible/)).toBeInTheDocument()
    await envoyer(utilisateur)

    expect(await screen.findByText(/Ce mot de passe est trop facile à deviner/)).toBeInTheDocument()
    expect(api.nombre(INSCRIPTION)).toBe(0)
  })

  it('courriel déjà utilisé : l’erreur va sous le champ courriel, qui reçoit le focus', async () => {
    simulerApi({ [INSCRIPTION]: () => repondre(409, { code: 'COURRIEL_DEJA_UTILISE' }) })
    const { utilisateur } = afficherApp('/inscription')

    await remplir(utilisateur, 'cheval-pile-agrafe-correct')
    await envoyer(utilisateur)

    expect(await screen.findByText('Ce courriel est déjà utilisé par un compte.')).toBeInTheDocument()
    expect(screen.getByLabelText('Courriel')).toHaveFocus()
  })

  it("l'API refuse un mot de passe jugé bon : la jauge s'aligne, et le même ne repart pas", async () => {
    const api = simulerApi({ [INSCRIPTION]: () => repondre(400, { code: 'MOT_DE_PASSE_TROP_FAIBLE' }) })
    const { utilisateur } = afficherApp('/inscription')

    await remplir(utilisateur, 'cheval-pile-agrafe-correct')
    expect(await screen.findByText(/Solidité : excellente/)).toBeInTheDocument()
    await envoyer(utilisateur)

    expect(await screen.findByText(/Ce mot de passe est trop facile à deviner/)).toBeInTheDocument()
    expect(await screen.findByText(/Solidité : moyenne/)).toBeInTheDocument()

    await envoyer(utilisateur) // même mot de passe : refusé tout de suite
    expect(api.nombre(INSCRIPTION)).toBe(1)
  })

  it('inscription réussie : « Vérifiez votre courriel » avec l’adresse utilisée', async () => {
    const api = simulerApi({ [INSCRIPTION]: () => repondre(201, { utilisateurId: 'u-1', entrepriseId: 'e-1' }) })
    const { utilisateur, routeur } = afficherApp('/inscription')

    await remplir(utilisateur, 'cheval-pile-agrafe-correct')
    await envoyer(utilisateur)

    expect(await screen.findByRole('heading', { name: 'Vérifiez votre courriel' })).toBeInTheDocument()
    expect(screen.getByText('marie@plomberie-tremblay.ca')).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/courriel-envoye')
    expect(api.dernierCorps(INSCRIPTION)).toMatchObject({ prenom: 'Marie', accepteConditions: true })
  })
})
