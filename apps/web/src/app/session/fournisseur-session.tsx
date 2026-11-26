import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { appelerApi, ErreurApi } from '@/shared/lib/api'
import { ContexteSession, type EtatSession, type Utilisateur } from './contexte-session'

const lireProfil = () => appelerApi<Utilisateur>('/auth/moi')

/** Qui est connecté ? Seul un 401 veut dire « personne » ; les autres erreurs, « on ne sait pas ». */
async function etatDepuisApi(): Promise<EtatSession> {
  try {
    return { statut: 'connecte', utilisateur: await lireProfil() }
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 401) return { statut: 'anonyme' }
    return { statut: 'indisponible', erreur }
  }
}

/** Sait qui est connecté et le partage à toute l'application. */
export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ statut: 'chargement' })

  // Au démarrage : les cookies de session sont-ils encore valides ?
  useEffect(() => {
    void etatDepuisApi().then(setEtat)
  }, [])

  const reessayer = useCallback(() => {
    setEtat({ statut: 'chargement' })
    void etatDepuisApi().then(setEtat)
  }, [])

  const connecter = useCallback(async (courriel: string, motDePasse: string) => {
    await appelerApi('/auth/connexion', {
      methode: 'POST',
      corps: { courriel, motDePasse },
      sansRenouvellement: true,
    })
    // Connectée : si le profil ne se lit pas, l'écran « indisponible » propose de réessayer.
    setEtat(await etatDepuisApi())
  }, [])

  // Si l'appel échoue, on reste connecté : l'écran affiche l'erreur (important sur un poste partagé).
  const deconnecter = useCallback(async () => {
    await appelerApi('/auth/deconnexion', { methode: 'POST', sansRenouvellement: true })
    setEtat({ statut: 'anonyme' })
  }, [])

  const session = useMemo(
    () => ({ etat, connecter, deconnecter, reessayer }),
    [etat, connecter, deconnecter, reessayer],
  )
  return <ContexteSession value={session}>{children}</ContexteSession>
}
