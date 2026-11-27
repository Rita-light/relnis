import { repondre, simulerApi } from '@/test/outils'
import { appelerApi } from './api'

describe('appelerApi', () => {
  it('accepte une réponse sans corps (202 Accepted)', async () => {
    simulerApi({ 'POST /auth/mot-de-passe-oublie': () => repondre(202) })
    await expect(appelerApi('/auth/mot-de-passe-oublie', { methode: 'POST', corps: {} })).resolves.toBeUndefined()
  })

  it("transforme une erreur de l'API en ErreurApi (statut, code, champs)", async () => {
    simulerApi({
      'POST /auth/inscription': () =>
        repondre(400, { code: 'DONNEES_INVALIDES', details: { champs: { courriel: ['isEmail'] } } }),
    })
    await expect(appelerApi('/auth/inscription', { methode: 'POST', corps: {} })).rejects.toMatchObject({
      statut: 400,
      code: 'DONNEES_INVALIDES',
      champs: { courriel: ['isEmail'] },
    })
  })

  it('sur 401, renouvelle la session puis réessaie ; un seul renouvellement pour plusieurs requêtes', async () => {
    let renouvelee = false
    const api = simulerApi({
      'GET /auth/moi': () => (renouvelee ? repondre(200, { id: 'u-1' }) : repondre(401, { code: 'NON_AUTHENTIFIE' })),
      'POST /auth/renouveler': () => {
        renouvelee = true
        return repondre(200, {})
      },
    })

    const resultats = await Promise.all([appelerApi('/auth/moi'), appelerApi('/auth/moi')])
    expect(resultats).toEqual([{ id: 'u-1' }, { id: 'u-1' }])
    expect(api.nombre('POST /auth/renouveler')).toBe(1)
  })

  it('ne renouvelle pas pour une route d’authentification (sansRenouvellement)', async () => {
    const api = simulerApi({ 'POST /auth/connexion': () => repondre(401, { code: 'IDENTIFIANTS_INVALIDES' }) })
    await expect(
      appelerApi('/auth/connexion', { methode: 'POST', corps: {}, sansRenouvellement: true }),
    ).rejects.toMatchObject({ code: 'IDENTIFIANTS_INVALIDES' })
    expect(api.nombre('POST /auth/renouveler')).toBe(0)
  })

  it('renouvellement en panne (503) : erreur du service, pas une déconnexion', async () => {
    simulerApi({ 'POST /auth/renouveler': () => repondre(503, { code: 'SERVICE_INDISPONIBLE' }) })
    await expect(appelerApi('/auth/moi')).rejects.toMatchObject({ statut: 503, code: 'SERVICE_INDISPONIBLE' })
  })

  it('API arrêtée derrière le proxy (502 sans corps) : SERVICE_INDISPONIBLE', async () => {
    simulerApi({ 'GET /sante': () => repondre(502) })
    await expect(appelerApi('/sante')).rejects.toMatchObject({ statut: 502, code: 'SERVICE_INDISPONIBLE' })
  })

  it('réseau coupé : ERREUR_RESEAU', async () => {
    simulerApi({
      'GET /sante': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await expect(appelerApi('/sante')).rejects.toMatchObject({ statut: 0, code: 'ERREUR_RESEAU' })
  })
})
