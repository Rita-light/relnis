import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function PageIntrouvable() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <title>{`${t('introuvable.titre')} · Relnis`}</title>
      <h1 className="text-2xl font-semibold">{t('introuvable.titre')}</h1>
      <p className="text-muted-foreground">{t('introuvable.texte')}</p>
      <Link to="/" className="text-lien underline underline-offset-4">
        {t('introuvable.retour')}
      </Link>
    </main>
  )
}
