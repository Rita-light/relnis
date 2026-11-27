import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PiedDePage } from '@/shared/components/pied-de-page'
import { SelecteurLangue } from '@/shared/components/selecteur-langue'
import { DOCUMENTS, type NomDocument } from './documents'

// À changer à chaque modification des textes légaux (affichée en haut des pages).
const MISE_A_JOUR = new Date(2026, 10, 26) // 26 novembre 2026 (les mois commencent à 0)

/** Conditions d'utilisation ou politique de confidentialité : ouvertes à tous, connecté ou non. */
export function PageLegale({ document }: { document: NomDocument }) {
  const { t, i18n } = useTranslation()
  const langue = i18n.resolvedLanguage === 'en' ? 'en' : 'fr' // français par défaut (Loi 96)
  const { titre, intro, sections } = DOCUMENTS[langue][document]
  const date = new Intl.DateTimeFormat(langue, { dateStyle: 'long' }).format(MISE_A_JOUR)

  return (
    <div className="flex min-h-svh flex-col">
      <title>{`${titre} · Relnis`}</title>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2 rounded-md text-lg font-semibold">
            <img src="/relnis-logo-clair.svg" alt="" className="size-8 dark:hidden" />
            <img src="/relnis-logo-fonce.svg" alt="" className="hidden size-8 dark:block" />
            Relnis
          </Link>
          <SelecteurLangue />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <article className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold text-balance">{titre}</h1>
            <p className="text-sm text-muted-foreground">{t('legal.miseAJour', { date })}</p>
            <p className="flex items-start gap-2 rounded-lg bg-alerte px-4 py-3 text-sm text-alerte-foreground">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t('legal.preliminaire')}
            </p>
            <p className="leading-relaxed">{intro}</p>
          </div>

          {sections.map((section, i) => (
            <section key={section.titre} aria-labelledby={`section-${i + 1}`} className="flex flex-col gap-3">
              <h2 id={`section-${i + 1}`} className="text-xl font-semibold">
                {i + 1}. {section.titre}
              </h2>
              {section.avant.map((paragraphe) => (
                <p key={paragraphe} className="leading-relaxed">
                  {paragraphe}
                </p>
              ))}
              {section.liste.length > 0 && (
                <ul className="ml-5 flex list-disc flex-col gap-1.5 leading-relaxed">
                  {section.liste.map((puce) => (
                    <li key={puce}>{puce}</li>
                  ))}
                </ul>
              )}
              {section.apres.map((paragraphe) => (
                <p key={paragraphe} className="leading-relaxed">
                  {paragraphe}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>

      <PiedDePage className="border-t pt-6" />
    </div>
  )
}
