import { LANGUES } from './langues'

/** Toutes les clés d'un fichier de textes, sous la forme « section.cle ». */
const cles = (objet: object, prefixe = ''): string[] =>
  Object.entries(objet).flatMap(([cle, valeur]) =>
    typeof valeur === 'object' && valeur !== null ? cles(valeur, `${prefixe}${cle}.`) : [prefixe + cle],
  )

const [reference, ...autres] = LANGUES // le français sert de modèle

describe('fichiers de textes', () => {
  it.each(autres)('$code a exactement les mêmes clés que le français', ({ textes }) => {
    expect(cles(textes).sort()).toEqual(cles(reference.textes).sort())
  })

  it.each(LANGUES)('$code : aucun texte vide', ({ textes }) => {
    const vides = cles(textes).filter((cle) => {
      const valeur = cle.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], textes)
      return typeof valeur !== 'string' || valeur.trim() === ''
    })
    expect(vides).toEqual([])
  })

  it.each(autres)('$code garde les mêmes variables {{…}} que le français', ({ textes }) => {
    const variables = (t: object) =>
      cles(t).map((cle) => {
        const valeur = cle.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], t) as string
        return `${cle}: ${[...valeur.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).join(',')}`
      })
    expect(variables(textes).sort()).toEqual(variables(reference.textes).sort())
  })
})
