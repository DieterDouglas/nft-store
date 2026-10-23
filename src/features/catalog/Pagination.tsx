import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Compact page list: 1 … 4 5 6 … 12 */
function pages(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (['gap', p] as const) : [p]))
}

const item = 'grid size-8 place-items-center rounded border border-border text-sm transition-colors hover:border-primary'

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link to="/" search={(prev) => ({ ...prev, page: page - 1 })} hash="catalogo" className={item} aria-label="Página anterior">
              <ChevronLeft className="size-4" />
            </Link>
          </li>
        )}
        {pages(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                to="/"
                search={(prev) => ({ ...prev, page: p === 1 ? undefined : p })}
                hash="catalogo"
                aria-label={`Página ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(item, p === page && 'border-primary bg-primary font-bold text-primary-foreground')}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link to="/" search={(prev) => ({ ...prev, page: page + 1 })} hash="catalogo" className={item} aria-label="Próxima página">
              <ChevronRight className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
