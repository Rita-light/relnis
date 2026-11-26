import { ErreurApi } from './api'

// Codes d'erreur de l'API traduits dans locales/*.json (section « erreurs »).
const CODES_CONNUS = [
  'IDENTIFIANTS_INVALIDES',
  'COURRIEL_NON_VERIFIE',
  'COMPTE_BLOQUE_TEMPORAIREMENT',
  'TROP_DE_DEMANDES',
  'COURRIEL_DEJA_UTILISE',
  'JETON_INVALIDE',
  'JETON_EXPIRE',
  'SESSION_INVALIDE',
  'DONNEES_INVALIDES',
  'SERVICE_INDISPONIBLE',
  'ERREUR_RESEAU',
  'ERREUR_INTERNE',
] as const

export type CodeErreur = (typeof CODES_CONNUS)[number]

/** La clé de traduction d'une erreur ; un code inconnu devient « erreur interne ». */
export function cleErreur(erreur: unknown): `erreurs.${CodeErreur}` {
  const code = erreur instanceof ErreurApi ? erreur.code : 'ERREUR_INTERNE'
  const connu = (CODES_CONNUS as readonly string[]).includes(code)
  return `erreurs.${connu ? (code as CodeErreur) : 'ERREUR_INTERNE'}`
}
