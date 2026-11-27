import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ErreurChamp, ErreurFormulaire, SuccesFormulaire } from '@/shared/components/messages-formulaire'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { appelerApi } from '@/shared/lib/api'
import { ATTENTE_RENVOI_MS, DUREE_LIEN_REINITIALISATION_MINUTES, reglesCourriel } from './validation'

/** Demande d'un lien pour choisir un nouveau mot de passe. */
export function MotDePasseOublie() {
  const { t } = useTranslation()
  const [envoye, setEnvoye] = useState(false)
  const [erreurApi, setErreurApi] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ courriel: string }>()

  // Même réponse que le compte existe ou non : on ne révèle pas qui est inscrit.
  const envoyer = handleSubmit(async ({ courriel }) => {
    setErreurApi(null)
    try {
      await appelerApi('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { courriel }, sansRenouvellement: true })
      setEnvoye(true)
      setTimeout(() => setEnvoye(false), ATTENTE_RENVOI_MS)
    } catch (erreur) {
      setErreurApi(erreur)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t('motDePasseOublie.titre')} · Relnis`}</title>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('motDePasseOublie.titre')}</h1>
        <p className="text-sm text-muted-foreground">{t('motDePasseOublie.explication')}</p>
      </div>

      <form noValidate onSubmit={(e) => void envoyer(e)}>
        <FieldGroup>
          <ErreurFormulaire erreur={erreurApi} />
          {envoye && (
            <SuccesFormulaire>
              {t('motDePasseOublie.envoye', { minutes: DUREE_LIEN_REINITIALISATION_MINUTES })}
            </SuccesFormulaire>
          )}

          <Field data-invalid={!!errors.courriel}>
            <FieldLabel htmlFor="courriel">{t('champs.courriel')}</FieldLabel>
            <Input
              id="courriel"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.courriel}
              {...register('courriel', reglesCourriel)}
            />
            <ErreurChamp erreur={errors.courriel} />
          </Field>

          <Button type="submit" variant="action" size="lg" disabled={isSubmitting || envoye}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t('motDePasseOublie.envoyer')}
          </Button>
        </FieldGroup>
      </form>

      <Link to="/connexion" className="text-center text-sm text-lien underline underline-offset-4">
        {t('commun.retourConnexion')}
      </Link>
    </div>
  )
}
