import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

/** Champ mot de passe avec un bouton pour l'afficher (moins d'erreurs de frappe, surtout sur téléphone). */
export function InputMotDePasse({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-9', className)} />
      {/* Bouton bascule : son nom reste fixe, aria-pressed dit s'il est activé.
          Centré sans translate (sinon l'effet de clic du bouton le fait sauter) et sans enfoncement. */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute inset-y-0 right-0.5 my-auto text-muted-foreground active:not-aria-[haspopup]:translate-y-0"
        aria-label={t('champs.afficherMotDePasse')}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
