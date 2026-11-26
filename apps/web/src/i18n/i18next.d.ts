import 'i18next'
import type fr from './locales/fr.json'

// Le fichier français sert de modèle : une clé qui n'existe pas
// (ex. une faute de frappe) devient une erreur de compilation.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof fr }
  }
}
