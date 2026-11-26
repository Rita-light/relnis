import { ChevronDown, Languages } from 'lucide-react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUES } from '@/langues'

/** Menu des langues (le choix est gardé dans le navigateur). */
export function SelecteurLangue({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const actuelle = LANGUES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUES[0]

  return (
    <DropdownMenu>
      {/* Le nom accessible contient le texte visible (« Langue : Français ») */}
      <DropdownMenuTrigger
        aria-label={`${t('commun.langue')} : ${actuelle.nom}`}
        className={cn(buttonVariants({ variant: 'ghost' }), className)}
      >
        <Languages aria-hidden="true" />
        {actuelle.nom}
        <ChevronDown aria-hidden="true" className="opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('commun.langue')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={actuelle.code}
            onValueChange={(code: string) => void i18n.changeLanguage(code)}
          >
            {LANGUES.map((langue) => (
              <DropdownMenuRadioItem key={langue.code} value={langue.code} lang={langue.code}>
                {langue.nom}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
