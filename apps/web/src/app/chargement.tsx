import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Indicateur plein écran pendant qu'on vérifie la session. */
export function Chargement() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex min-h-svh items-center justify-center text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none" />
      <span className="sr-only">{t('commun.chargement')}</span>
    </div>
  )
}
