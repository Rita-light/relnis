import type { CodeLangue } from '@/i18n/langues'
import { documentsEn } from './documents.en'
import { documentsFr } from './documents.fr'

/** Une section : paragraphes avant, liste à puces, paragraphes après. */
export interface Section {
  titre: string
  avant: string[]
  liste: string[]
  apres: string[]
}

export interface DocumentLegal {
  titre: string
  intro: string
  sections: Section[]
}

export type NomDocument = 'conditions' | 'confidentialite'

// Des documents, pas des textes d'interface : hors de fr.json (trop longs pour le typage des clés i18next).
// « satisfies » : ajouter une langue dans langues.ts sans ses documents devient une erreur de compilation.
export const DOCUMENTS = { fr: documentsFr, en: documentsEn } satisfies Record<
  CodeLangue,
  Record<NomDocument, DocumentLegal>
>
