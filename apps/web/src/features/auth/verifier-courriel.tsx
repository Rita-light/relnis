import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Button, buttonVariants } from '@/shared/ui/button'
import { appelerApi, ErreurApi } from '@/shared/lib/api'
import { aLeCode, cleErreur } from '@/shared/lib/erreurs'

type Etat = { statut: 'verification' } | { statut: 'reussi' } | { statut: 'echec'; erreur: unknown }

/** Page ouverte depuis le lien du courriel : /verifier-courriel?jeton=… */
export function VerifierCourriel() {
  const { t } = useTranslation()
  const jeton = useSearchParams()[0].get('jeton')
  const [etat, setEtat] = useState<Etat>(() =>
    jeton ? { statut: 'verification' } : { statut: 'echec', erreur: new ErreurApi(400, 'JETON_INVALIDE') },
  )

  const envoyer = useCallback(() => {
    if (!jeton) return
    appelerApi('/auth/verifier-courriel', { methode: 'POST', corps: { jeton }, sansRenouvellement: true })
      .then(() => setEtat({ statut: 'reussi' }))
      .catch((erreur: unknown) => setEtat({ statut: 'echec', erreur }))
  }, [jeton])

  // Un seul envoi : en développement, React lance les effets deux fois, et le jeton ne sert qu'une fois.
  const dejaEnvoye = useRef(false)
  useEffect(() => {
    if (dejaEnvoye.current) return
    dejaEnvoye.current = true
    envoyer()
  }, [envoyer])

  const reessayer = () => {
    setEtat({ statut: 'verification' })
    envoyer()
  }

  if (etat.statut === 'verification') {
    return (
      <div role="status" className="flex items-center gap-3 text-muted-foreground">
        <title>{`${t('verifierCourriel.titreEnCours')} · Relnis`}</title>
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
        {t('verifierCourriel.enCours')}
      </div>
    )
  }

  if (etat.statut === 'reussi') {
    return (
      <div className="flex flex-col gap-4">
        <title>{`${t('verifierCourriel.titreReussi')} · Relnis`}</title>
        <CircleCheck aria-hidden="true" className="size-10 text-primary" />
        <h1 className="text-2xl font-semibold">{t('verifierCourriel.titreReussi')}</h1>
        <p className="text-sm text-muted-foreground">{t('verifierCourriel.reussi')}</p>
        <Link to="/connexion" className={buttonVariants({ variant: 'action', size: 'lg' })}>
          {t('verifierCourriel.seConnecter')}
        </Link>
      </div>
    )
  }

  // Lien mauvais ou expiré : en demander un autre. Sinon (réseau, 503…), le jeton est peut-être encore bon.
  const lienEnCause = aLeCode(etat.erreur, 'JETON_INVALIDE') || aLeCode(etat.erreur, 'JETON_EXPIRE')
  return (
    <div className="flex flex-col gap-4">
      <title>{`${t('verifierCourriel.titreEchec')} · Relnis`}</title>
      <CircleAlert aria-hidden="true" className="size-10 text-destructive" />
      <h1 className="text-2xl font-semibold">{t('verifierCourriel.titreEchec')}</h1>
      <p role="alert" className="text-sm text-muted-foreground">
        {t(cleErreur(etat.erreur))}
      </p>
      {lienEnCause ? (
        <Link to="/courriel-envoye" className={buttonVariants({ variant: 'action', size: 'lg' })}>
          {t('verifierCourriel.nouveauLien')}
        </Link>
      ) : (
        <Button variant="action" size="lg" onClick={reessayer}>
          {t('indisponible.reessayer')}
        </Button>
      )}
      <Link to="/connexion" className="text-center text-sm text-lien underline underline-offset-4">
        {t('courrielEnvoye.retourConnexion')}
      </Link>
    </div>
  )
}
