// Lancé avant chaque fichier de test (vitest.config.ts → setupFiles).
import '@testing-library/jest-dom/vitest' // expect(…).toBeInTheDocument(), toHaveFocus()…
import i18n from '@/i18n/i18n'

// Les tests lisent les textes en français, la langue par défaut de Relnis (jsdom annonce l'anglais).
await i18n.changeLanguage('fr')

// jsdom ne fait pas défiler la page ; ScrollRestoration l'appelle à chaque navigation.
window.scrollTo = () => {}
