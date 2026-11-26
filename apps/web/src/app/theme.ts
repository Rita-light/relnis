// Mode clair ou sombre selon le système, en attendant le choix dans le profil.
const sombre = window.matchMedia('(prefers-color-scheme: dark)')
const appliquer = () => document.documentElement.classList.toggle('dark', sombre.matches)

appliquer()
sombre.addEventListener('change', appliquer)
