import { createContext, use } from 'react'

export type Role = 'ADMINISTRATEUR' | 'GESTIONNAIRE' | 'EMPLOYE' | 'COMPTABLE'

/** Profil renvoyé par GET /auth/moi. */
export interface Utilisateur {
  id: string
  prenom: string
  nom: string
  courriel: string
  role: Role
  langue: string
  theme: 'CLAIR' | 'SOMBRE' | 'SYSTEME'
  entreprise: { id: string; nom: string }
}

export type EtatSession =
  | { statut: 'chargement' }
  | { statut: 'anonyme' }
  | { statut: 'connecte'; utilisateur: Utilisateur }
  // Session inconnue : l'API n'a pas pu répondre (réseau, 503…), ce n'est pas une déconnexion.
  | { statut: 'indisponible'; erreur: unknown }

export interface Session {
  etat: EtatSession
  connecter: (courriel: string, motDePasse: string) => Promise<void>
  deconnecter: () => Promise<void>
  reessayer: () => void
}

export const ContexteSession = createContext<Session | null>(null)

/** La session en cours, depuis n'importe quel composant sous <FournisseurSession>. */
export function useSession(): Session {
  const session = use(ContexteSession)
  if (!session) throw new Error('useSession doit être utilisé sous <FournisseurSession>')
  return session
}
