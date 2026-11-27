import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useSession } from '@/app/session/contexte-session'
import { ErreurChamp, ErreurFormulaire } from '@/shared/components/messages-formulaire'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { appelerApi, ErreurApi } from '@/shared/lib/api'
import { aLeCode, cleErreur } from '@/shared/lib/erreurs'
import { InputMotDePasse } from './input-mot-de-passe'
import { JaugeSolidite } from './jauge-solidite'
import { prechargerSolidite, regleSolidite } from './solidite-mot-de-passe'
import { MOT_DE_PASSE_MAX, MOT_DE_PASSE_MIN } from './validation'

// Ici on ne connaît pas encore la personne : l'API vérifiera son nom, son courriel, etc.
const sansIndices = () => []

/** Page ouverte depuis le lien du courriel : /nouveau-mot-de-passe?jeton=… */
export function NouveauMotDePasse() {
  const { t } = useTranslation()
  const jeton = useSearchParams()[0].get('jeton')
  const { etat, actualiser } = useSession()
  const [reussi, setReussi] = useState(false)
  const [erreurApi, setErreurApi] = useState<unknown>(() => (jeton ? null : new ErreurApi(400, 'JETON_INVALIDE')))
  // Mot de passe que l'API a jugé trop faible (elle connaît le nom de la personne, pas la jauge)
  const [refuseParApi, setRefuseParApi] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<{ motDePasse: string }>()
  const motDePasse = useWatch({ control, name: 'motDePasse' }) // suivi pour la jauge
  // Dictionnaires téléchargés dès l'ouverture ; sans jeton, la page affiche seulement « lien non valide »
  useEffect(() => {
    if (jeton) prechargerSolidite()
  }, [jeton])

  const enregistrer = handleSubmit(async ({ motDePasse }) => {
    setErreurApi(null)
    try {
      await appelerApi('/auth/nouveau-mot-de-passe', {
        methode: 'POST',
        corps: { jeton, motDePasse },
        sansRenouvellement: true,
      })
      setReussi(true)
      // L'API a fermé toutes les sessions : si ce navigateur en avait une, l'interface doit le savoir.
      if (etat.statut === 'connecte') actualiser()
    } catch (erreur) {
      // Trop faible (ex. contient son nom) : l'erreur va sous le champ, le lien reste utilisable.
      if (aLeCode(erreur, 'MOT_DE_PASSE_TROP_FAIBLE')) {
        setRefuseParApi(motDePasse)
        setError('motDePasse', { type: 'MOT_DE_PASSE_TROP_FAIBLE' }, { shouldFocus: true })
      } else {
        setErreurApi(erreur)
      }
    }
  })

  if (reussi) {
    return (
      <div className="flex flex-col gap-4">
        <title>{`${t('nouveauMotDePasse.titreReussi')} · Relnis`}</title>
        <CircleCheck aria-hidden="true" className="size-10 text-primary" />
        <h1 className="text-2xl font-semibold">{t('nouveauMotDePasse.titreReussi')}</h1>
        <p className="text-sm text-muted-foreground">{t('nouveauMotDePasse.reussi')}</p>
        <Link to="/connexion" className={buttonVariants({ variant: 'action', size: 'lg' })}>
          {t('nouveauMotDePasse.seConnecter')}
        </Link>
      </div>
    )
  }

  // Lien absent, mauvais ou expiré : inutile de garder le formulaire, on propose un nouveau lien.
  if (aLeCode(erreurApi, 'JETON_INVALIDE') || aLeCode(erreurApi, 'JETON_EXPIRE')) {
    return (
      <div className="flex flex-col gap-4">
        <title>{`${t('nouveauMotDePasse.titreLienInvalide')} · Relnis`}</title>
        <CircleAlert aria-hidden="true" className="size-10 text-destructive" />
        <h1 className="text-2xl font-semibold">{t('nouveauMotDePasse.titreLienInvalide')}</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {t(cleErreur(erreurApi))}
        </p>
        <Link to="/mot-de-passe-oublie" className={buttonVariants({ variant: 'action', size: 'lg' })}>
          {t('nouveauMotDePasse.nouveauLien')}
        </Link>
        <Link to="/connexion" className="text-center text-sm text-lien underline underline-offset-4">
          {t('commun.retourConnexion')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t('nouveauMotDePasse.titre')} · Relnis`}</title>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('nouveauMotDePasse.titre')}</h1>
        <p className="text-sm text-muted-foreground">{t('nouveauMotDePasse.explication')}</p>
      </div>

      <form noValidate onSubmit={(e) => void enregistrer(e)}>
        <FieldGroup>
          <ErreurFormulaire erreur={erreurApi} />

          <Field data-invalid={!!errors.motDePasse}>
            <FieldLabel htmlFor="motDePasse">{t('nouveauMotDePasse.champ')}</FieldLabel>
            <InputMotDePasse
              id="motDePasse"
              autoComplete="new-password"
              aria-invalid={!!errors.motDePasse}
              aria-describedby="aide-mot-de-passe"
              {...register('motDePasse', {
                required: true,
                minLength: MOT_DE_PASSE_MIN,
                maxLength: MOT_DE_PASSE_MAX,
                validate: regleSolidite(sansIndices, () => refuseParApi),
              })}
            />
            <JaugeSolidite
              motDePasse={motDePasse ?? ''}
              indices={[]}
              refuseParApi={!!motDePasse && motDePasse === refuseParApi}
            />
            <FieldDescription id="aide-mot-de-passe">
              {t('champs.aideMotDePasse', { min: MOT_DE_PASSE_MIN })}
            </FieldDescription>
            <ErreurChamp erreur={errors.motDePasse} min={MOT_DE_PASSE_MIN} />
          </Field>

          <Button type="submit" variant="action" size="lg" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t('nouveauMotDePasse.enregistrer')}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}
