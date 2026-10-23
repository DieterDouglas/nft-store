import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, SlidersHorizontal } from 'lucide-react'
import { SORTS, type Sort } from '@/api/types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SORT_LABEL } from '@/lib/labels'
import { CatalogFilters } from './CatalogFilters'
import { useNftList } from './hooks'
import { toggle, toListParams, withFilter, type CatalogSearch } from './search'

/** Mobile frame top: "Explorar coleções" search + filter button (filters and sort in a sheet). */
export function MobileCatalogBar({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(search.q ?? '')
  // Same query as the catalog below: served from cache, only used for facet counts.
  const facets = useNftList(toListParams(search)).data?.facets
  const active = (search.category?.length ?? 0) + (search.network?.length ?? 0) + (search.minPrice || search.maxPrice ? 1 : 0)

  const update = (patch: Partial<CatalogSearch>) =>
    navigate({ to: '/', search: (prev) => withFilter(prev, patch), hash: 'catalogo', resetScroll: false })

  return (
    <div className="flex items-center gap-3 pt-6">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault()
          void update({ q: q.trim() || undefined })
        }}
      >
        <label htmlFor="mobile-search" className="sr-only">
          Explorar coleções
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary" />
        <input
          id="mobile-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Explorar coleções"
          className="h-14 w-full rounded-2xl bg-card pr-4 pl-12 text-base placeholder:text-primary/80 focus-visible:outline-2 focus-visible:outline-ring"
        />
      </form>
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={`Filtros e ordenação${active ? `, ${active} ativos` : ''}`}
            className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary to-[#b8733d] text-primary-foreground"
          >
            <SlidersHorizontal className="size-6" />
            {active > 0 && (
              <span aria-hidden className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {active}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-background">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados atualizam a cada seleção.</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-8">
            <div className="grid gap-2">
              <Label htmlFor="mobile-sort">Ordenar por</Label>
              <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v === 'recent' ? undefined : (v as Sort) })}>
                <SelectTrigger id="mobile-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SORT_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CatalogFilters
              search={search}
              facets={facets}
              onChange={update}
              onToggle={(key, value) => update({ [key]: toggle(search[key] as string[] | undefined, value) } as Partial<CatalogSearch>)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
