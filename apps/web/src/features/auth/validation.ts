// Mêmes règles que l'API (class-validator) : l'erreur s'affiche avant même l'envoi.
export const COURRIEL_MAX = 254
export const MOT_DE_PASSE_MIN = 12
export const MOT_DE_PASSE_MAX = 128
export const FORMAT_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Texte obligatoire, sans espaces autour (comme l'API). */
export const reglesTexte = (max: number) => ({
  required: true,
  maxLength: max,
  setValueAs: (valeur: string) => valeur.trim(),
})

export const reglesCourriel = {
  required: true,
  maxLength: COURRIEL_MAX,
  pattern: FORMAT_COURRIEL,
  setValueAs: (valeur: string) => valeur.trim(),
}

// L'API ignore un nouvel envoi de courriel dans la minute qui suit : le bouton attend autant.
export const ATTENTE_RENVOI_MS = 60_000
export const DUREE_LIEN_REINITIALISATION_MINUTES = 60
