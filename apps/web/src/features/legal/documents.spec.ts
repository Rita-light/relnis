import { DOCUMENTS, type DocumentLegal } from './documents'

/** La forme d'un document : nombre de paragraphes et de puces par section. */
const forme = (document: DocumentLegal) =>
  document.sections.map((s) => [s.avant.length, s.liste.length, s.apres.length])

describe('documents légaux', () => {
  it.each(['conditions', 'confidentialite'] as const)(
    '%s : la version anglaise suit section par section la version française (qui prévaut)',
    (nom) => {
      expect(forme(DOCUMENTS.en[nom])).toEqual(forme(DOCUMENTS.fr[nom]))
    },
  )

  it('aucun texte vide', () => {
    const textes = Object.values(DOCUMENTS).flatMap((documents) =>
      Object.values(documents).flatMap((d) => [
        d.titre,
        d.intro,
        ...d.sections.flatMap((s) => [s.titre, ...s.avant, ...s.liste, ...s.apres]),
      ]),
    )
    expect(textes.filter((t) => t.trim() === '')).toEqual([])
  })
})
