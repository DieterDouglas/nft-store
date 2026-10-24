import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  label: string
  /** solid: orange buttons (desktop, detail bar) · soft: dark buttons with orange icons (mobile cart). */
  variant?: 'solid' | 'soft'
  className?: string
}

const base = 'grid place-items-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40'
const variants = {
  solid: 'size-6 bg-primary text-primary-foreground hover:opacity-90',
  soft: 'size-9 border border-border bg-muted text-primary hover:bg-secondary',
}

export function QuantityStepper({ value, max, onChange, disabled, label, variant = 'solid', className }: Props) {
  const button = cn(base, variants[variant])
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-3', className)}>
      <button type="button" className={button} aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        <Minus className="size-3.5" />
      </button>
      <output aria-live="polite" className="w-5 text-center tabular-nums">
        {value}
      </output>
      <button type="button" className={button} aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
