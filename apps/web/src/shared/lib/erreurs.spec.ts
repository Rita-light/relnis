import { ErreurApi } from './api'
import { aLeCode, cleCode, cleErreur } from './erreurs'

describe('cleErreur', () => {
  it("donne la clé de traduction d'un code connu", () => {
    expect(cleErreur(new ErreurApi(401, 'IDENTIFIANTS_INVALIDES'))).toBe('erreurs.IDENTIFIANTS_INVALIDES')
  })

  it('remplace un code inconnu ou une erreur quelconque par « erreur interne »', () => {
    expect(cleCode('CODE_INCONNU')).toBe('erreurs.ERREUR_INTERNE')
    expect(cleErreur(new TypeError('panne'))).toBe('erreurs.ERREUR_INTERNE')
  })
})

describe('aLeCode', () => {
  it("ne reconnaît que les erreurs de l'API avec ce code", () => {
    expect(aLeCode(new ErreurApi(409, 'COURRIEL_DEJA_UTILISE'), 'COURRIEL_DEJA_UTILISE')).toBe(true)
    expect(aLeCode(new ErreurApi(400, 'JETON_INVALIDE'), 'COURRIEL_DEJA_UTILISE')).toBe(false)
    expect(aLeCode(new Error('COURRIEL_DEJA_UTILISE'), 'COURRIEL_DEJA_UTILISE')).toBe(false)
  })
})
