// Lancé avant chaque fichier de test (vitest.config.ts → setupFiles).
import type {} from '@testing-library/jest-dom/vitest' // types de expect(…).toBeInTheDocument(), toHaveFocus()…
import * as verifications from '@testing-library/jest-dom/matchers'
import i18n from '@/i18n/i18n'

// Ajoutées à l'expect global, celui des tests : un fichier lancé seul peut recevoir une autre copie de « vitest ».
expect.extend(verifications)

// Les tests lisent les textes en français, la langue par défaut de Relnis (jsdom annonce l'anglais).
await i18n.changeLanguage('fr')

// jsdom ne fait pas défiler la page ; ScrollRestoration l'appelle à chaque navigation.
window.scrollTo = () => {}
