// Mêmes règles que l'API (class-validator) : l'erreur s'affiche avant même l'envoi.
export const COURRIEL_MAX = 254
export const MOT_DE_PASSE_MIN = 12
export const MOT_DE_PASSE_MAX = 128
export const FORMAT_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const reglesCourriel = {
  required: true,
  maxLength: COURRIEL_MAX,
  pattern: FORMAT_COURRIEL,
  setValueAs: (valeur: string) => valeur.trim(),
}
