import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ErreurChamp, ErreurFormulaire } from '@/shared/components/messages-formulaire'
import { InputMotDePasse } from './input-mot-de-passe'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { aLeCode } from '@/shared/lib/erreurs'
import { MOT_DE_PASSE_MAX, reglesCourriel } from './validation'
import { useSession } from '@/app/session/contexte-session'

interface Valeurs {
  courriel: string
  motDePasse: string
}

export function Connexion() {
  const { t } = useTranslation()
  const { connecter } = useSession()
  const [erreurApi, setErreurApi] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Valeurs>()

  // Une fois connecté, RouteVisiteur redirige tout seul vers la page demandée.
  const soumettre = handleSubmit(async ({ courriel, motDePasse }) => {
    setErreurApi(null)
    try {
      await connecter(courriel, motDePasse)
    } catch (erreur) {
      setErreurApi(erreur)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t('connexion.titre')} · Relnis`}</title>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('connexion.titre')}</h1>
        <p className="text-sm text-muted-foreground">{t('connexion.sousTitre')}</p>
      </div>

      <form noValidate onSubmit={(e) => void soumettre(e)}>
        <FieldGroup>
          <ErreurFormulaire erreur={erreurApi} />
          {aLeCode(erreurApi, 'COURRIEL_NON_VERIFIE') && (
            <Link
              to="/courriel-envoye"
              state={{ courriel: getValues('courriel') }}
              className="-mt-2 text-sm text-lien underline underline-offset-4"
            >
              {t('connexion.nouveauLien')}
            </Link>
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

          <Field data-invalid={!!errors.motDePasse}>
            <FieldLabel htmlFor="motDePasse">{t('champs.motDePasse')}</FieldLabel>
            <InputMotDePasse
              id="motDePasse"
              autoComplete="current-password"
              aria-invalid={!!errors.motDePasse}
              {...register('motDePasse', { required: true, maxLength: MOT_DE_PASSE_MAX })}
            />
            <ErreurChamp erreur={errors.motDePasse} />
            {/* Après le champ : Tab va du courriel au mot de passe sans détour */}
            <Link to="/mot-de-passe-oublie" className="w-fit! text-sm text-lien underline-offset-4 hover:underline">
              {t('connexion.oublie')}
            </Link>
          </Field>

          <Button type="submit" variant="action" size="lg" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t('connexion.seConnecter')}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('connexion.pasDeCompte')}{' '}
        <Link to="/inscription" className="text-lien underline underline-offset-4">
          {t('connexion.creerEntreprise')}
        </Link>
      </p>
    </div>
  )
}
