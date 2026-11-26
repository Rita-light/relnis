import { Navigate, Outlet, useLocation } from 'react-router'
import { Chargement } from '@/app/chargement'
import { ServiceIndisponible } from '@/app/service-indisponible'
import { useSession } from './contexte-session'

/** Pages réservées aux personnes connectées ; sinon, direction la connexion. */
export function RoutePrivee() {
  const { etat, reessayer } = useSession()
  const { pathname } = useLocation()

  if (etat.statut === 'chargement') return <Chargement />
  if (etat.statut === 'indisponible') {
    return <ServiceIndisponible erreur={etat.erreur} reessayer={reessayer} />
  }
  if (etat.statut === 'anonyme') {
    return <Navigate to="/connexion" replace state={{ depuis: pathname }} />
  }
  return <Outlet />
}

/** Pages pour les visiteurs (connexion, inscription…) ; une personne connectée repart où elle allait. */
export function RouteVisiteur() {
  const { etat, reessayer } = useSession()
  const { state } = useLocation()

  if (etat.statut === 'chargement') return <Chargement />
  if (etat.statut === 'indisponible') {
    return <ServiceIndisponible erreur={etat.erreur} reessayer={reessayer} />
  }
  if (etat.statut === 'connecte') {
    const depuis = (state as { depuis?: string } | null)?.depuis
    return <Navigate to={depuis ?? '/'} replace />
  }
  return <Outlet />
}
