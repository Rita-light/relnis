import { CloudOff, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cleErreur } from '@/lib/erreurs'

/** La session n'a pas pu être vérifiée : on le dit, au lieu de faire croire à une déconnexion. */
export function ServiceIndisponible({ erreur, reessayer }: { erreur: unknown; reessayer: () => void }) {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <title>{`${t('indisponible.titre')} · Relnis`}</title>
      <CloudOff aria-hidden="true" className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">{t('indisponible.titre')}</h1>
      <p role="alert" className="max-w-sm text-muted-foreground">
        {t(cleErreur(erreur))}
      </p>
      <Button variant="action" size="lg" onClick={reessayer}>
        <RotateCw aria-hidden="true" />
        {t('indisponible.reessayer')}
      </Button>
    </main>
  )
}
