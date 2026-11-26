import { CircleAlert } from 'lucide-react'
import type { FieldError as ErreurRhf } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldError } from '@/components/ui/field'
import { cleErreur } from '@/lib/erreurs'

/** Message sous un champ, selon la règle non respectée (obligatoire, format, longueur). */
export function ErreurChamp({ erreur, min }: { erreur?: ErreurRhf; min?: number }) {
  const { t } = useTranslation()
  if (!erreur) return null

  const messages: Record<string, string> = {
    required: t('validation.requis'),
    pattern: t('validation.courrielInvalide'),
    minLength: t('validation.tropCourt', { min }),
    maxLength: t('validation.tropLong'),
  }
  return <FieldError>{messages[erreur.type] ?? t('validation.invalide')}</FieldError>
}

/** Erreur renvoyée par l'API, au-dessus du formulaire (annoncée par les lecteurs d'écran). */
export function ErreurFormulaire({ erreur }: { erreur: unknown }) {
  const { t } = useTranslation()
  if (!erreur) return null

  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-erreur px-3 py-2 text-sm text-erreur-foreground">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {t(cleErreur(erreur))}
    </p>
  )
}
