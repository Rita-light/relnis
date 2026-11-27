import { screen } from '@testing-library/react'
import { afficherApp, simulerApi } from '@/test/outils'

// Fichier de la page impossible à télécharger : arrive si une nouvelle version a été mise en ligne entre-temps.
vi.mock('@/features/legal/page-legale', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

describe("erreur de l'application", () => {
  it('page impossible à télécharger : message clair et bouton pour recharger (pas un écran blanc)', async () => {
    simulerApi()
    afficherApp('/conditions')

    expect(await screen.findByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Cette page n'a pas pu s'afficher")
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument()
  })
})
