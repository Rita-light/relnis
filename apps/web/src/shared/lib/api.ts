/** Erreur de l'API, au format { code, message, details } (le code est traduit par l'interface). */
export class ErreurApi extends Error {
  readonly statut: number
  readonly code: string
  readonly champs: Record<string, string[]>

  constructor(statut: number, code: string, champs: Record<string, string[]> = {}) {
    super(code)
    this.statut = statut
    this.code = code
    this.champs = champs
  }
}

interface OptionsAppel {
  methode?: 'GET' | 'POST' | 'PATCH'
  corps?: unknown
  // Pour les routes d'authentification : un 401 y est une vraie réponse, pas une session expirée.
  sansRenouvellement?: boolean
}

/** Construit l'erreur à partir d'une réponse en échec. */
async function erreurDepuis(reponse: Response): Promise<ErreurApi> {
  const corps = (await reponse.json().catch(() => ({}))) as {
    code?: string
    details?: { champs?: Record<string, string[]> }
  }
  // Sans code : réponse du proxy (Vite, Vercel) quand l'API ne répond pas.
  const codeParDefaut = [502, 503, 504].includes(reponse.status) ? 'SERVICE_INDISPONIBLE' : 'ERREUR_INTERNE'
  return new ErreurApi(reponse.status, corps.code ?? codeParDefaut, corps.details?.champs)
}

const erreurReseau = () => new ErreurApi(0, 'ERREUR_RESEAU') // pas de réponse du tout

// Une seule demande de renouvellement à la fois, même si plusieurs requêtes échouent ensemble.
// Résultat : null si renouvelée, sinon l'erreur (lue une seule fois, partagée par tous).
let renouvellementEnCours: Promise<ErreurApi | null> | null = null

function renouvelerSession(): Promise<ErreurApi | null> {
  renouvellementEnCours ??= fetch('/api/v1/auth/renouveler', { method: 'POST' })
    .then((reponse) => (reponse.ok ? null : erreurDepuis(reponse)))
    .catch(erreurReseau)
    .finally(() => {
      renouvellementEnCours = null
    })
  return renouvellementEnCours
}

/** Appelle l'API (via le proxy /api). Sur 401, renouvelle la session puis réessaie une fois. */
export async function appelerApi<T>(chemin: string, options: OptionsAppel = {}): Promise<T> {
  const envoyer = () =>
    fetch(`/api/v1${chemin}`, {
      method: options.methode ?? 'GET',
      headers: options.corps === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    }).catch((): never => {
      throw erreurReseau()
    })

  let reponse = await envoyer()
  if (reponse.status === 401 && !options.sansRenouvellement) {
    const echec = await renouvelerSession()
    if (!echec) reponse = await envoyer()
    // Renouvellement refusé (401) : la session est finie. Autre échec : l'API est en cause.
    else if (echec.statut !== 401) throw echec
  }

  if (!reponse.ok) throw await erreurDepuis(reponse)
  // Certaines réponses n'ont pas de corps (202, 204) : json() planterait sur un texte vide.
  const texte = await reponse.text()
  return (texte ? JSON.parse(texte) : undefined) as T
}
