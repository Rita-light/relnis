import en from './locales/en.json'
import fr from './locales/fr.json'

// Seul endroit à modifier pour ajouter une langue (plus son fichier locales/xx.json).
// Chaque nom est écrit dans sa propre langue : on reconnaît la sienne même sans la comprendre.
export const LANGUES = [
  { code: 'fr', nom: 'Français', textes: fr },
  { code: 'en', nom: 'English', textes: en },
] as const

export type CodeLangue = (typeof LANGUES)[number]['code']
