import { Link, useNavigate } from '@tanstack/react-router'
import { SlidersHorizontal, X } from 'lucide-react'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CATEGORY_LABEL, NETWORK_LABEL, SORT_LABEL, TAB_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { SORTS, TABS, type Sort } from '@/api/types'
import { CatalogFilters } from './CatalogFilters'
import { useNftList } from './hooks'
import { NftCard, NftCardSkeleton } from './NftCard'
import { Pagination } from './Pagination'
import { PAGE_SIZE, toggle, toListParams, withFilter, type CatalogSearch } from './search'
import { FeaturedNft } from './FeaturedNft'

export function CatalogSection({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate()
  const list = useNftList(toListParams(search))

  const update = (patch: Partial<CatalogSearch>) =>
    navigate({ to: '/', search: (prev) => withFilter(prev, patch), hash: 'catalogo', resetScroll: false })
  const onToggle = (key: 'category' | 'network', value: string) =>
    update({ [key]: toggle(search[key] as string[] | undefined, value) } as Partial<CatalogSearch>)

  const chips = [
    ...(search.q ? [{ label: `Busca: “${search.q}”`, clear: { q: undefined } }] : []),
    ...(search.category ?? []).map((c) => ({ label: CATEGORY_LABEL[c], clear: { category: toggle(search.category, c) } })),
    ...(search.network ?? []).map((n) => ({ label: NETWORK_LABEL[n], clear: { network: toggle(search.network, n) } })),
    ...(search.minPrice || search.maxPrice
      ? [{ label: `Preço: ${search.minPrice ?? '0'}–${search.maxPrice ?? '∞'} ETH`, clear: { minPrice: undefined, maxPrice: undefined } }]
      : []),
  ]

  const filters = <CatalogFilters search={search} facets={list.data?.facets} onChange={update} onToggle={onToggle} />
  const tab = search.tab ?? 'all'

  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="scroll-mt-4 pt-16 max-md:pt-6">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden space-y-6 lg:block" aria-label="Filtros">
          {filters}
          <FeaturedNft />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border">
            <nav aria-label="Seções do catálogo" className="-mb-px flex gap-6 overflow-x-auto">
              {TABS.map((t) => (
                <Link
                  key={t}
                  to="/"
                  search={(prev) => withFilter(prev, { tab: t === 'all' ? undefined : t })}
                  hash="catalogo"
                  resetScroll={false}
                  aria-current={t === tab ? 'page' : undefined}
                  className={cn(
                    'border-b-2 py-2 text-sm whitespace-nowrap transition-colors',
                    t === tab ? 'border-primary text-primary' : 'border-transparent hover:text-primary',
                  )}
                >
                  {TAB_LABEL[t]}
                </Link>
              ))}
            </nav>
            <div className="flex w-full items-center gap-2 pb-2 max-md:hidden sm:w-auto">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal /> Filtros {chips.length > 0 && `(${chips.length})`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="overflow-y-auto bg-background">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Os resultados atualizam a cada seleção.</SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-6">{filters}</div>
                </SheetContent>
              </Sheet>
              <label htmlFor="catalog-sort" className="ml-auto text-sm whitespace-nowrap max-sm:sr-only">
                Ordenar por:
              </label>
              <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v === 'recent' ? undefined : (v as Sort) })}>
                <SelectTrigger id="catalog-sort" size="sm" className="ml-auto min-w-0 border-none bg-transparent px-1 shadow-none sm:ml-0 sm:w-56">
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
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Button variant="secondary" size="xs" onClick={() => update(chip.clear as Partial<CatalogSearch>)} aria-label={`Remover filtro ${chip.label}`}>
                    {chip.label} <X />
                  </Button>
                </li>
              ))}
              <li>
                <Button variant="link" size="xs" onClick={() => navigate({ to: '/', search: { tab: search.tab, sort: search.sort }, hash: 'catalogo', resetScroll: false })}>
                  Limpar filtros
                </Button>
              </li>
            </ul>
          )}

          <p className="sr-only" aria-live="polite">
            {list.isFetching ? 'Carregando resultados…' : list.data ? `${list.data.total} NFTs encontrados, página ${list.data.page} de ${list.data.totalPages}.` : ''}
          </p>

          {list.isPending ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6 max-md:pb-16 max-md:[&>li:nth-child(even)]:translate-y-16" aria-busy="true" aria-label="Carregando NFTs">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <li key={i}>
                  <NftCardSkeleton />
                </li>
              ))}
            </ul>
          ) : list.isError && !list.data ? (
            <QueryError error={list.error} onRetry={() => void list.refetch()} title="Não foi possível carregar o catálogo." />
          ) : list.data.items.length === 0 ? (
            <StateMessage
              title="Nenhum NFT encontrado"
              description="Tente remover alguns filtros ou buscar por outro termo."
              action={
                chips.length > 0 && (
                  <Button variant="outline" onClick={() => navigate({ to: '/', search: {}, hash: 'catalogo', resetScroll: false })}>
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <>
              {list.isError && (
                <QueryError error={list.error} onRetry={() => void list.refetch()} title="Não foi possível atualizar o catálogo." />
              )}
              <ul
                className={cn('grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity md:grid-cols-3 lg:gap-x-6 max-md:pb-16 max-md:[&>li:nth-child(even)]:translate-y-16', list.isPlaceholderData && 'opacity-60')}
                aria-busy={list.isFetching}
              >
                {list.data.items.map((nft, i) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={i < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={list.data.page} totalPages={list.data.totalPages} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
