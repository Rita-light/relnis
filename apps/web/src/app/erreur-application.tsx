import { RotateCw, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'

/** Une page a planté ou n'a pas pu être téléchargée (ex. nouvelle version mise en ligne entre-temps). */
export function ErreurApplication() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <title>{`${t('erreurApplication.titre')} · Relnis`}</title>
      <TriangleAlert aria-hidden="true" className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">{t('erreurApplication.titre')}</h1>
      <p role="alert" className="max-w-sm text-muted-foreground">
        {t('erreurApplication.texte')}
      </p>
      {/* Recharger récupère la version en ligne et ses fichiers à jour. */}
      <Button variant="action" size="lg" onClick={() => window.location.reload()}>
        <RotateCw aria-hidden="true" />
        {t('erreurApplication.recharger')}
      </Button>
    </main>
  )
}
