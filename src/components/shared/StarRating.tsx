import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({ value, className }: { value: number; className?: string }) {
  const label = `Avaliação ${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5`
  return (
    <span role="img" aria-label={label} className={cn('inline-flex gap-0.5 text-primary', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={cn('size-3.5', i < Math.round(value) ? 'fill-primary' : 'fill-none')} />
      ))}
    </span>
  )
}
