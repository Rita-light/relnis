import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { LANGUES } from './langues'

// Garde <html lang="…"> à jour : un lecteur d'écran lit le texte avec le bon accent.
// L'écouteur est posé AVANT init(), pour attraper aussi la langue choisie au démarrage.
i18n.on('languageChanged', (langue) => {
  document.documentElement.lang = langue
})

void i18n
  .use(LanguageDetector) // 1. choix gardé dans le navigateur, 2. langue du navigateur
  .use(initReactI18next) // branche i18next sur React
  .init({
    resources: Object.fromEntries(LANGUES.map((l) => [l.code, { translation: l.textes }])),
    fallbackLng: 'fr', // 3. français par défaut (Loi 96)
    supportedLngs: LANGUES.map((l) => l.code),
    load: 'languageOnly', // fr-CA → fr, en-US → en
    interpolation: { escapeValue: false }, // React protège déjà contre l'injection de code
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
