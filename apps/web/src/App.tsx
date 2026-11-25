import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Page temporaire pour vérifier le thème Atlantic Pulse et les traductions.
function App() {
  const { t, i18n } = useTranslation()
  const [sombre, setSombre] = useState(false)

  // La classe « dark » va sur <html> : toute la page bascule, y compris les
  // fenêtres et menus que shadcn affiche en dehors de ce composant.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', sombre)
  }, [sombre])

  const enFrancais = i18n.resolvedLanguage === 'fr'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 bg-sidebar px-6 py-4 text-sidebar-foreground">
        <img src="/relnis-logo-fonce.svg" alt="" className="h-8 w-8" />
        <h1 className="text-lg font-semibold">{t('testTheme.titre')}</h1>
        <Button
          variant="ghost"
          className="ml-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          lang={enFrancais ? 'en' : 'fr'}
          onClick={() => void i18n.changeLanguage(enFrancais ? 'en' : 'fr')}
        >
          {t('commun.autreLangue')}
        </Button>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="font-semibold">{t('testTheme.boutons')}</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="action">{t('testTheme.validerSortie')}</Button>
            <Button>{t('testTheme.boutonParDefaut')}</Button>
            <Button variant="outline">{t('testTheme.annuler')}</Button>
            <Button variant="ghost">{t('testTheme.discret')}</Button>
            <Button variant="link">{t('testTheme.voirHistorique')}</Button>
          </div>
          <a href="#" className="w-fit text-sm text-lien underline">
            {t('testTheme.lienExemple')}
          </a>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="font-semibold">{t('testTheme.etats')}</h2>
          <p className="flex items-center gap-2 rounded-lg bg-succes px-4 py-2 text-succes-foreground">
            <CircleCheck aria-hidden="true" /> {t('testTheme.sortieEnregistree')}
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-alerte px-4 py-2 text-alerte-foreground">
            <TriangleAlert aria-hidden="true" /> {t('testTheme.stockBas')}
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-erreur px-4 py-2 text-erreur-foreground">
            <CircleX aria-hidden="true" /> {t('testTheme.stockInsuffisant')}
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-info-foreground">
            <Info aria-hidden="true" /> {t('testTheme.information')}
          </p>
          <span className="w-fit rounded-full bg-ia px-3 py-1 text-sm text-ia-foreground">
            {t('testTheme.lueParIA')}
          </span>
        </section>

        <Button variant="outline" className="w-fit" onClick={() => setSombre(!sombre)}>
          {sombre ? t('testTheme.modeClair') : t('testTheme.modeSombre')}
        </Button>
      </main>
    </div>
  )
}

export default App