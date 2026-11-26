import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import fr from '@/i18n/locales/fr.json'
import { evaluerMotDePasse, SCORE_MINIMUM, type Solidite } from './solidite-mot-de-passe'
import { MOT_DE_PASSE_MIN } from './validation'

// Attente après la dernière frappe : on évalue (et on annonce) quand la personne fait une pause.
const PAUSE_MS = 250

// Clés de conseils de zxcvbn qu'on a traduites (fr.json sert de référence, comme pour les types i18n).
type CleAvertissement = keyof typeof fr.solidite.avertissements
type CleSuggestion = keyof typeof fr.solidite.suggestions
const estAvertissement = (cle: string | null | undefined): cle is CleAvertissement =>
  !!cle && cle in fr.solidite.avertissements
const estSuggestion = (cle: string | null | undefined): cle is CleSuggestion => !!cle && cle in fr.solidite.suggestions

/**
 * Jauge de solidité sous le champ « nouveau mot de passe » : 4 barres, un niveau en mots, un conseil.
 * refuseParApi : ce mot de passe, l'API l'a jugé trop faible ; la jauge s'aligne sur elle.
 */
export function JaugeSolidite({
  motDePasse,
  indices,
  refuseParApi = false,
}: {
  motDePasse: string
  indices: string[]
  refuseParApi?: boolean
}) {
  const { t } = useTranslation()
  const [resultat, setResultat] = useState<(Solidite & { pour: string }) | null>(null)
  const cleIndices = indices.join('\n') // valeur simple : l'effet ne repart pas à chaque affichage

  useEffect(() => {
    if (!motDePasse) return
    let annule = false
    const minuterie = setTimeout(() => {
      evaluerMotDePasse(motDePasse, cleIndices.split('\n'))
        .then((r) => !annule && setResultat({ ...r, pour: motDePasse }))
        .catch(() => {}) // évaluateur indisponible : pas de jauge, l'API vérifiera
    }, PAUSE_MS)
    return () => {
      annule = true
      clearTimeout(minuterie)
    }
  }, [motDePasse, cleIndices])

  // Rien à montrer tant que le résultat ne correspond pas au texte saisi.
  if (!motDePasse || resultat?.pour !== motDePasse) return null

  const tropCourt = motDePasse.length < MOT_DE_PASSE_MIN
  // Refusé par l'API : au plus « moyenne », pour ne jamais contredire le message d'erreur.
  const niveau = tropCourt ? 0 : refuseParApi ? Math.min(resultat.score, SCORE_MINIMUM - 1) : resultat.score
  const libelles = [
    t('solidite.tresFaible'),
    t('solidite.faible'),
    t('solidite.moyen'),
    t('solidite.solide'),
    t('solidite.tresSolide'),
  ]
  const couleur =
    niveau < 2 ? 'bg-destructive' : niveau < SCORE_MINIMUM ? 'bg-alerte-foreground' : 'bg-succes-foreground'

  // Le conseil le plus précis disponible : avertissement, sinon suggestion, sinon conseil général.
  const [suggestion] = resultat.suggestions
  let conseil: string | null = null
  if (tropCourt) conseil = t('solidite.tropCourt', { min: MOT_DE_PASSE_MIN })
  else if (niveau < SCORE_MINIMUM) {
    if (estAvertissement(resultat.avertissement)) conseil = t(`solidite.avertissements.${resultat.avertissement}`)
    else if (estSuggestion(suggestion)) conseil = t(`solidite.suggestions.${suggestion}`)
    else conseil = t('solidite.conseil')
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Les barres doublent le texte (jamais la couleur seule) */}
      <div aria-hidden="true" className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((barre) => (
          <span key={barre} className={cn('h-1.5 rounded-full', Math.max(niveau, 1) >= barre ? couleur : 'bg-muted')} />
        ))}
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t('solidite.libelle', { niveau: libelles[niveau] })}</span>
        {conseil && ` — ${conseil}`}
      </p>
    </div>
  )
}
