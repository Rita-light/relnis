import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ErreurChamp, ErreurFormulaire } from '@/shared/components/erreurs-formulaire'
import { InputMotDePasse } from '@/features/auth/input-mot-de-passe'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { appelerApi } from '@/shared/lib/api'
import { aLeCode } from '@/shared/lib/erreurs'
import { MOT_DE_PASSE_MAX, MOT_DE_PASSE_MIN, reglesCourriel, reglesTexte } from '@/features/auth/validation'

interface Valeurs {
  nomEntreprise: string
  prenom: string
  nom: string
  courriel: string
  motDePasse: string
  accepteConditions: boolean
}

// Les pages légales s'ouvrent dans un nouvel onglet : le formulaire rempli reste intact.
const lienLegal = 'text-lien underline underline-offset-4'

export function Inscription() {
  const { t } = useTranslation()
  const naviguer = useNavigate()
  const [erreurApi, setErreurApi] = useState<unknown>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Valeurs>({ defaultValues: { accepteConditions: false } })

  const soumettre = handleSubmit(async (valeurs) => {
    setErreurApi(null)
    try {
      await appelerApi('/auth/inscription', { methode: 'POST', corps: valeurs, sansRenouvellement: true })
      void naviguer('/courriel-envoye', { state: { courriel: valeurs.courriel } })
    } catch (erreur) {
      // Courriel déjà pris : l'erreur va sous le champ concerné, qui reçoit le focus.
      if (aLeCode(erreur, 'COURRIEL_DEJA_UTILISE')) {
        setError('courriel', { type: 'COURRIEL_DEJA_UTILISE' }, { shouldFocus: true })
      } else {
        setErreurApi(erreur)
      }
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t('inscription.titre')} · Relnis`}</title>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('inscription.titre')}</h1>
        <p className="text-sm text-muted-foreground">{t('inscription.sousTitre')}</p>
      </div>

      <form noValidate onSubmit={(e) => void soumettre(e)}>
        <FieldGroup>
          <ErreurFormulaire erreur={erreurApi} />

          <Field data-invalid={!!errors.nomEntreprise}>
            <FieldLabel htmlFor="nomEntreprise">{t('champs.nomEntreprise')}</FieldLabel>
            <Input
              id="nomEntreprise"
              autoComplete="organization"
              aria-invalid={!!errors.nomEntreprise}
              {...register('nomEntreprise', reglesTexte(200))}
            />
            <ErreurChamp erreur={errors.nomEntreprise} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.prenom}>
              <FieldLabel htmlFor="prenom">{t('champs.prenom')}</FieldLabel>
              <Input
                id="prenom"
                autoComplete="given-name"
                aria-invalid={!!errors.prenom}
                {...register('prenom', reglesTexte(100))}
              />
              <ErreurChamp erreur={errors.prenom} />
            </Field>
            <Field data-invalid={!!errors.nom}>
              <FieldLabel htmlFor="nom">{t('champs.nom')}</FieldLabel>
              <Input
                id="nom"
                autoComplete="family-name"
                aria-invalid={!!errors.nom}
                {...register('nom', reglesTexte(100))}
              />
              <ErreurChamp erreur={errors.nom} />
            </Field>
          </div>

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
              autoComplete="new-password"
              aria-invalid={!!errors.motDePasse}
              aria-describedby="aide-mot-de-passe"
              {...register('motDePasse', {
                required: true,
                minLength: MOT_DE_PASSE_MIN,
                maxLength: MOT_DE_PASSE_MAX,
              })}
            />
            <FieldDescription id="aide-mot-de-passe">
              {t('inscription.aideMotDePasse', { min: MOT_DE_PASSE_MIN })}
            </FieldDescription>
            <ErreurChamp erreur={errors.motDePasse} min={MOT_DE_PASSE_MIN} />
          </Field>

          {/* Consentement obligatoire (Loi 25) ; Controller car la case Base UI n'est pas un <input> natif */}
          <Controller
            name="accepteConditions"
            control={control}
            rules={{ validate: (coche) => coche }}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <Checkbox
                  id="accepteConditions"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  inputRef={field.ref}
                  aria-invalid={fieldState.invalid}
                />
                <FieldContent>
                  <label htmlFor="accepteConditions" className="text-sm leading-snug">
                    <Trans
                      i18nKey="inscription.accepte"
                      components={{
                        conditions: <Link to="/conditions" target="_blank" rel="noreferrer" className={lienLegal} />,
                        confidentialite: (
                          <Link to="/confidentialite" target="_blank" rel="noreferrer" className={lienLegal} />
                        ),
                      }}
                    />
                    <span className="sr-only"> {t('commun.nouvelOnglet')}</span>
                  </label>
                  <ErreurChamp erreur={fieldState.error} message={t('validation.accepter')} />
                </FieldContent>
              </Field>
            )}
          />

          <Button type="submit" variant="action" size="lg" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t('inscription.creer')}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('inscription.dejaCompte')}{' '}
        <Link to="/connexion" className="text-lien underline underline-offset-4">
          {t('inscription.seConnecter')}
        </Link>
      </p>
    </div>
  )
}
