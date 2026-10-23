import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Category, Facet, Network, NftListResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { CATEGORY_LABEL, NETWORK_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search'

interface Props {
  search: CatalogSearch
  facets: NftListResponse['facets'] | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  onToggle: (key: 'category' | 'network', value: string) => void
}

function FacetList<T extends Category | Network>({
  title,
  facets,
  labels,
  selected,
  onToggle,
}: {
  title: string
  facets: Facet<T>[]
  labels: Record<T, string>
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <section aria-labelledby={`facet-${title}`}>
      <h3 id={`facet-${title}`} className="mb-3 font-bold">
        {title}
      </h3>
      <ul className="space-y-1">
        {facets.map((f) => {
          const active = selected.includes(f.id)
          return (
            <li key={f.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(f.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  active ? 'text-primary' : 'text-foreground/90',
                )}
              >
                <span className="flex items-center gap-2">
                  <Check aria-hidden className={cn('size-3.5', active ? 'opacity-100' : 'opacity-0')} />
                  {labels[f.id]}
                </span>
                <span className={cn('tabular-nums', active ? 'text-primary' : 'text-muted-foreground')}>
                  ({f.count})
                  <span className="sr-only"> itens</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PriceRange({ search, bounds, onApply }: { search: CatalogSearch; bounds: { min: number; max: number }; onApply: (range: [number, number]) => void }) {
  // Draft range; the parent keys this component by the URL values, so history navigation
  // or "clear filters" remounts it with the new range.
  const [range, setRange] = useState<[number, number]>([Number(search.minPrice ?? bounds.min), Number(search.maxPrice ?? bounds.max)])

  return (
    <section aria-labelledby="facet-price" className="space-y-3">
      <h3 id="facet-price" className="font-bold">
        Faixa de preço
      </h3>
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={0.01}
        value={range}
        onValueChange={(v) => setRange([v[0], v[1]])}
        minStepsBetweenThumbs={1}
        aria-label="Faixa de preço em ETH"
        className="py-2"
      />
      <p className="text-sm" aria-live="polite">
        Preço: {range[0].toFixed(2).replace('.', ',')} – {range[1].toFixed(2).replace('.', ',')} ETH
      </p>
      <Button size="sm" onClick={() => onApply(range)}>
        Aplicar
      </Button>
    </section>
  )
}

export function CatalogFilters({ search, facets, onChange, onToggle }: Props) {
  const bounds = facets ? { min: Number(facets.priceRange.min), max: Number(facets.priceRange.max) } : { min: 0, max: 12.3 }
  return (
    <div className="space-y-8 rounded-md bg-card p-5">
      {facets ? (
        <>
          <FacetList
            title="Coleções"
            facets={facets.categories}
            labels={CATEGORY_LABEL}
            selected={search.category ?? []}
            onToggle={(v) => onToggle('category', v)}
          />
          <PriceRange
            key={`${search.minPrice ?? ''}-${search.maxPrice ?? ''}-${bounds.min}-${bounds.max}`}
            search={search}
            bounds={bounds}
            onApply={([min, max]) =>
              onChange({
                minPrice: min <= bounds.min ? undefined : min.toFixed(2),
                maxPrice: max >= bounds.max ? undefined : max.toFixed(2),
              })
            }
          />
          <FacetList title="Rede" facets={facets.networks} labels={NETWORK_LABEL} selected={search.network ?? []} onToggle={(v) => onToggle('network', v)} />
        </>
      ) : (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="shimmer h-6 rounded" />
          ))}
        </div>
      )}
    </div>
  )
}
