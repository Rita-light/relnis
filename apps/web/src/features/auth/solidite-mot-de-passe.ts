import type { ZxcvbnFactory } from '@zxcvbn-ts/core'

/** Même seuil que l'API (note zxcvbn de 0 à 4). */
export const SCORE_MINIMUM = 3

/** Note et conseils ; les conseils sont des clés (ex. « sequences »), traduites dans locales/ (section « solidite »). */
export interface Solidite {
  score: number
  avertissement: string | null
  suggestions: string[]
}

// Mêmes dictionnaires que l'API : la jauge et le serveur donnent le même verdict.
// Lourds (environ 1,1 Mo) : fichiers séparés, téléchargés seulement sur les pages qui en ont besoin,
// puis gardés en cache par le navigateur.
let evaluateur: Promise<ZxcvbnFactory> | undefined

function zxcvbn() {
  evaluateur ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-fr'),
    import('@zxcvbn-ts/language-en'),
  ])
    .then(
      ([{ ZxcvbnFactory }, commun, fr, en]) =>
        new ZxcvbnFactory({
          dictionary: { ...commun.dictionary, ...fr.dictionary, ...en.dictionary },
          graphs: commun.adjacencyGraphs, // suites de clavier : azerty, qwerty…
          useLevenshteinDistance: true,
        }),
    )
    .catch((erreur: unknown) => {
      evaluateur = undefined // réseau coupé : on pourra réessayer
      throw erreur
    })
  return evaluateur
}

/** À appeler à l'ouverture de la page : le téléchargement se fait pendant que la personne remplit les autres champs. */
export function prechargerSolidite() {
  zxcvbn().catch(() => {}) // échec sans conséquence : on réessaiera à l'évaluation
}

/** Comme l'API : nom du site, infos de la personne et leurs morceaux. */
function indicesPersonnels(valeurs: string[]) {
  const morceaux = valeurs.flatMap((v) => [v, ...v.split(/[^\p{L}\p{N}]+/u)])
  return [...new Set(['relnis', ...morceaux.map((m) => m.toLowerCase()).filter((m) => m.length >= 3)])]
}

/** Évalue un mot de passe ; indices = infos que la personne pourrait réutiliser. */
export async function evaluerMotDePasse(motDePasse: string, indices: string[]): Promise<Solidite> {
  const { score, feedback } = (await zxcvbn()).check(motDePasse, indicesPersonnels(indices))
  return { score, avertissement: feedback.warning, suggestions: feedback.suggestions }
}

/**
 * Règle react-hook-form : refuse un mot de passe faible, ou déjà refusé par l'API
 * (elle connaît le nom et le courriel de la personne, pas toujours la jauge : elle a le dernier mot).
 */
export const regleSolidite = (indices: () => string[], refuseParApi: () => string | null = () => null) => ({
  MOT_DE_PASSE_TROP_FAIBLE: async (motDePasse: string) => {
    if (motDePasse === refuseParApi()) return false
    try {
      return (await evaluerMotDePasse(motDePasse, indices())).score >= SCORE_MINIMUM
    } catch {
      return true // évaluateur pas chargé : l'API vérifiera
    }
  },
})
