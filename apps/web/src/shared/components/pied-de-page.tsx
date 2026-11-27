import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

// Calculée une fois au chargement : un composant React ne doit pas lire l'heure pendant l'affichage.
const ANNEE = new Date().getFullYear()

/** © et liens vers les pages légales, en bas des écrans publics. */
export function PiedDePage({ className }: { className?: string }) {
  const { t } = useTranslation()
  const lien = 'text-lien underline-offset-4 hover:underline'

  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 pb-6 text-xs text-muted-foreground',
        className,
      )}
    >
      <span>{t('piedDePage.droits', { annee: ANNEE })}</span>
      <Link to="/conditions" className={lien}>
        {t('piedDePage.conditions')}
      </Link>
      <Link to="/confidentialite" className={lien}>
        {t('piedDePage.confidentialite')}
      </Link>
    </footer>
  )
}
