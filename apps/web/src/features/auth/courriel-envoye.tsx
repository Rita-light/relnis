import { useState } from 'react'
import { LoaderCircle, MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { ErreurChamp, ErreurFormulaire, SuccesFormulaire } from '@/shared/components/messages-formulaire'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { appelerApi } from '@/shared/lib/api'
import { ATTENTE_RENVOI_MS, reglesCourriel } from './validation'

/** Après l'inscription (ou une connexion refusée) : ouvrir le lien reçu, ou en demander un autre. */
export function CourrielEnvoye() {
  const { t } = useTranslation()
  const courrielConnu = (useLocation().state as { courriel?: string } | null)?.courriel
  const [envoye, setEnvoye] = useState(false)
  const [erreurApi, setErreurApi] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ courriel: string }>({ defaultValues: { courriel: courrielConnu ?? '' } })

  const renvoyer = handleSubmit(async ({ courriel }) => {
    setErreurApi(null)
    try {
      await appelerApi('/auth/renvoyer-verification', {
        methode: 'POST',
        corps: { courriel },
        sansRenouvellement: true,
      })
      setEnvoye(true)
      setTimeout(() => setEnvoye(false), ATTENTE_RENVOI_MS)
    } catch (erreur) {
      setErreurApi(erreur)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t('courrielEnvoye.titre')} · Relnis`}</title>
      <div className="flex flex-col gap-3">
        <MailCheck aria-hidden="true" className="size-10 text-primary" />
        <h1 className="text-2xl font-semibold">{t('courrielEnvoye.titre')}</h1>
        <p className="text-sm text-muted-foreground">
          {courrielConnu ? (
            <Trans
              i18nKey="courrielEnvoye.envoyeA"
              values={{ courriel: courrielConnu }}
              components={{ strong: <strong className="font-medium break-all text-foreground" /> }}
            />
          ) : (
            t('courrielEnvoye.envoye')
          )}
        </p>
        <p className="text-sm text-muted-foreground">{t('courrielEnvoye.rienRecu')}</p>
      </div>

      <form noValidate onSubmit={(e) => void renvoyer(e)}>
        <FieldGroup>
          <ErreurFormulaire erreur={erreurApi} />
          {envoye && <SuccesFormulaire>{t('courrielEnvoye.renvoye')}</SuccesFormulaire>}

          {/* Courriel inconnu (page rechargée, lien direct) : on le demande */}
          {!courrielConnu && (
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
          )}

          <Button type="submit" variant="outline" size="lg" disabled={isSubmitting || envoye}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t('courrielEnvoye.renvoyer')}
          </Button>
        </FieldGroup>
      </form>

      <Link to="/connexion" className="text-center text-sm text-lien underline underline-offset-4">
        {t('commun.retourConnexion')}
      </Link>
    </div>
  )
}
