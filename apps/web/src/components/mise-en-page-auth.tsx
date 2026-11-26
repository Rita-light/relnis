import { BellRing, CircleCheck, MapPin, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'
import { SelecteurLangue } from './selecteur-langue'

// Effet vitre ; opaque si le système demande moins de transparence.
const VITRE =
  'relative rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur-xl transparence-reduite:bg-sidebar-accent transparence-reduite:backdrop-blur-none'

// Calculée une fois au chargement : un composant React ne doit pas lire l'heure pendant l'affichage.
const ANNEE = new Date().getFullYear()

/** Taches de couleur floues, derrière la vitre (décor). */
function Taches({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary/60 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-action/40 blur-3xl" />
    </div>
  )
}

/** Les points forts de Relnis, avec leur icône. */
function PointsForts({ classeIcone }: { classeIcone: string }) {
  const { t } = useTranslation()
  const points = [
    { icone: MapPin, texte: t('authentification.panneau.emplacements') },
    { icone: BellRing, texte: t('authentification.panneau.alertes') },
  ]

  return (
    <ul className="flex flex-col gap-4">
      {points.map(({ icone: Icone, texte }) => (
        <li key={texte} className="flex items-center gap-3">
          <Icone aria-hidden="true" className={cn('size-5 shrink-0', classeIcone)} />
          {texte}
        </li>
      ))}
    </ul>
  )
}

/** Exemple d'écran de stock, pour montrer à quoi sert Relnis (décor, ignoré des lecteurs d'écran). */
function ApercuStock() {
  const { t } = useTranslation()
  const articles = [
    { nom: t('authentification.apercu.tuyau'), quantite: '128', bas: false },
    { nom: t('authentification.apercu.raccord'), quantite: '6', bas: true },
    { nom: t('authentification.apercu.ruban'), quantite: '40', bas: false },
  ]

  return (
    <div aria-hidden="true" className={cn(VITRE, 'w-full max-w-sm translate-x-12 -rotate-2 p-4')}>
      <p className="mb-3 text-sm font-medium opacity-80">{t('authentification.apercu.titre')}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {articles.map(({ nom, quantite, bas }) => (
          <li key={nom} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="flex-1 truncate">{nom}</span>
            <span className="font-medium tabular-nums">{quantite}</span>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                bas ? 'bg-alerte text-alerte-foreground' : 'bg-succes text-succes-foreground',
              )}
            >
              {bas ? <TriangleAlert className="size-3" /> : <CircleCheck className="size-3" />}
              {bas ? t('authentification.apercu.stockBas') : t('authentification.apercu.enStock')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Liens légaux, en bas de la colonne du formulaire. */
function PiedDePage() {
  const { t } = useTranslation()
  const lien = 'text-lien underline-offset-4 hover:underline'

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 pb-6 text-xs text-muted-foreground lg:px-10 lg:pb-8">
      <span>{t('piedDePage.droits', { annee: ANNEE })}</span>
      <Link to="/conditions" className={lien}>
        {t('piedDePage.conditions')}
      </Link>
      <Link to="/confidentialite" className={lien}>
        {t('piedDePage.confidentialite')}
      </Link>
    </footer>
  )
}

/**
 * Écrans d'authentification. Téléphone : grand bandeau Nuit, carte à cheval dessus, pied de page.
 * Grand écran : formulaire à gauche, panneau Nuit à droite.
 */
export function MiseEnPageAuth() {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-2">
      <div className="flex min-h-svh flex-col">
        {/* Bandeau Nuit sur téléphone ; simple en-tête sur grand écran */}
        <div className="relative flex min-h-[45svh] flex-col overflow-hidden bg-sidebar px-6 pt-6 pb-36 text-sidebar-foreground lg:min-h-0 lg:overflow-visible lg:bg-transparent lg:px-10 lg:pt-10 lg:pb-0 lg:text-foreground">
          <Taches className="lg:hidden" />
          <header className="relative flex items-center justify-between gap-4">
            <Link to="/connexion" className="flex items-center gap-2 rounded-md text-lg font-semibold">
              <img src="/relnis-logo-clair.svg" alt="" className="hidden size-8 lg:block lg:dark:hidden" />
              <img src="/relnis-logo-fonce.svg" alt="" className="size-8 lg:hidden lg:dark:block" />
              Relnis
            </Link>
            <SelecteurLangue className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent lg:hover:bg-muted lg:hover:text-foreground lg:dark:hover:bg-muted/50" />
          </header>
          {/* Centré entre l'en-tête et la carte */}
          <div className="relative flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center lg:hidden">
            <p className="max-w-sm text-xl font-semibold text-balance">{t('authentification.panneau.titre')}</p>
            <p className="max-w-xs text-sm text-balance text-sidebar-foreground/80">
              {t('authentification.panneau.sousTitre')}
            </p>
          </div>
        </div>

        {/* Téléphone : la carte remonte sur le bandeau, à cheval sur la jonction */}
        <main className="relative -mt-28 flex flex-1 flex-col items-center px-4 pb-8 lg:mt-0 lg:justify-center lg:p-10">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-card-foreground shadow-xl ring-1 ring-foreground/5 sm:p-8 dark:ring-white/10">
            <Outlet />
          </div>
        </main>

        <PiedDePage />
      </div>

      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-8">
        <Taches />
        <div className={cn(VITRE, 'flex max-w-md flex-col gap-6 p-8')}>
          <p className="text-2xl font-semibold text-balance">{t('authentification.panneau.titre')}</p>
          <PointsForts classeIcone="text-sidebar-primary" />
        </div>
        <ApercuStock />
      </aside>
    </div>
  )
}
