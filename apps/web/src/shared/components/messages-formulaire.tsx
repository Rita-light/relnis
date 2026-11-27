import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import type { FieldError as ErreurRhf } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldError } from '@/shared/ui/field'
import { cleCode, cleErreur } from '@/shared/lib/erreurs'

/**
 * Message sous un champ, selon la règle non respectée (obligatoire, format, longueur).
 * Un type en MAJUSCULES est un code de l'API (ex. COURRIEL_DEJA_UTILISE).
 */
export function ErreurChamp({ erreur, min, message }: { erreur?: ErreurRhf; min?: number; message?: string }) {
  const { t } = useTranslation()
  if (!erreur) return null

  const messages: Record<string, string> = {
    required: t('validation.requis'),
    pattern: t('validation.courrielInvalide'),
    minLength: t('validation.tropCourt', { min }),
    maxLength: t('validation.tropLong'),
  }
  const texte =
    message ??
    messages[erreur.type] ??
    (/^[A-Z_]+$/.test(erreur.type) ? t(cleCode(erreur.type)) : t('validation.invalide'))
  return <FieldError>{texte}</FieldError>
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

/** Confirmation après un envoi réussi (lue poliment par les lecteurs d'écran). */
export function SuccesFormulaire({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-lg bg-succes px-3 py-2 text-sm text-succes-foreground">
      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  )
}
