import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ErreurFormulaire } from '@/components/erreurs-formulaire'
import { SelecteurLangue } from '@/components/selecteur-langue'
import { Button } from '@/components/ui/button'
import { useSession } from '@/session/contexte-session'

/** Accueil provisoire : le tableau de bord viendra en phase 1. */
export function Accueil() {
  const { t } = useTranslation()
  const { etat, deconnecter } = useSession()
  const [erreur, setErreur] = useState<unknown>(null)

  if (etat.statut !== 'connecte') return null // RoutePrivee garantit déjà la connexion
  const { utilisateur } = etat

  const quitter = () => {
    setErreur(null)
    deconnecter().catch(setErreur)
  }

  return (
    <div className="min-h-svh">
      <title>{`${t('accueil.titre')} · Relnis`}</title>
      <header className="flex items-center gap-3 bg-sidebar px-6 py-3 text-sidebar-foreground">
        <img src="/relnis-logo-fonce.svg" alt="" className="size-8" />
        <span className="truncate font-semibold">{utilisateur.entreprise.nom}</span>
        <SelecteurLangue className="ml-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent" />
        <Button
          variant="ghost"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent"
          onClick={quitter}
        >
          <LogOut aria-hidden="true" />
          {/* Sur téléphone, seule l'icône reste visible ; le texte reste lu par les lecteurs d'écran */}
          <span className="sr-only sm:not-sr-only">{t('accueil.seDeconnecter')}</span>
        </Button>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <ErreurFormulaire erreur={erreur} />
        <h1 className="text-2xl font-semibold">{t('accueil.bonjour', { prenom: utilisateur.prenom })}</h1>
        <p className="text-muted-foreground">{t('accueil.bientot')}</p>
      </main>
    </div>
  )
}
