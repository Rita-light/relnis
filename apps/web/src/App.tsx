import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Page temporaire pour vérifier le thème Atlantic Pulse.
// Les textes seront traduits à l'étape 4d (react-i18next).
function App() {
  const [sombre, setSombre] = useState(false)

  // La classe « dark » va sur <html> : toute la page bascule, y compris les
  // fenêtres et menus que shadcn affiche en dehors de ce composant.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', sombre)
  }, [sombre])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 bg-sidebar px-6 py-4 text-sidebar-foreground">
        <img src="/relnis-logo-fonce.svg" alt="" className="h-8 w-8" />
        <h1 className="text-lg font-semibold">Relnis — test du thème</h1>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="font-semibold">Boutons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="action">Valider la sortie</Button>
            <Button>Bouton par défaut</Button>
            <Button variant="outline">Annuler</Button>
            <Button variant="ghost">Discret</Button>
            <Button variant="link">Voir l'historique</Button>
          </div>
          <p className="text-sm">
            Un <a href="#" className="text-lien underline">lien dans un texte</a> utilise
            l'Océan foncé.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="font-semibold">États (toujours une icône + un texte)</h2>
          <p className="flex items-center gap-2 rounded-lg bg-succes px-4 py-2 text-succes-foreground">
            <CircleCheck aria-hidden="true" /> Sortie enregistrée
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-alerte px-4 py-2 text-alerte-foreground">
            <TriangleAlert aria-hidden="true" /> Stock bas
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-erreur px-4 py-2 text-erreur-foreground">
            <CircleX aria-hidden="true" /> Stock insuffisant
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-info-foreground">
            <Info aria-hidden="true" /> Information
          </p>
          <span className="w-fit rounded-full bg-ia px-3 py-1 text-sm text-ia-foreground">
            Lue par l'IA
          </span>
        </section>

        <Button variant="outline" className="w-fit" onClick={() => setSombre(!sombre)}>
          {sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}
        </Button>
      </main>
    </div>
  )
}

export default App
