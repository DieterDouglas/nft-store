import { HttpResponse } from 'msw'
import { CATEGORIES, NETWORKS, SORTS, TABS, type Category, type Network, type Nft, type NftListResponse } from '@/api/types'
import { compare } from '@/lib/money'
import { toSummary } from '../commerce'
import { db, findNft } from '../db'
import { FIXTURE_NOW } from '../fixtures'
import { apiError, route } from '../http'
import { getScenario } from '../scenarios'

const NEW_WINDOW_MS = 30 * 86_400_000

function list<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  return params
    .getAll(key)
    .flatMap((v) => v.split(','))
    .filter((v): v is T => (allowed as readonly string[]).includes(v))
}

export const catalogHandlers = [
  route('get', '/nfts', 'catalog', ({ url }) => {
    const p = url.searchParams
    const q = p.get('q')?.trim().toLowerCase() ?? ''
    const categories = list<Category>(p, 'category', CATEGORIES)
    const networks = list<Network>(p, 'network', NETWORKS)
    const minPrice = p.get('minPrice')
    const maxPrice = p.get('maxPrice')
    const sort = SORTS.find((s) => s === p.get('sort')) ?? 'recent'
    const tab = TABS.find((t) => t === p.get('tab')) ?? 'all'
    const pageSize = Math.min(Math.max(Number(p.get('pageSize')) || 9, 1), 48)

    const all = getScenario() === 'empty' ? [] : db().nfts
    const base = all
      .filter((n) => !q || n.name.toLowerCase().includes(q) || n.creator.name.toLowerCase().includes(q))
      .filter((n) =>
        tab === 'new' ? Date.parse(n.createdAt) >= FIXTURE_NOW - NEW_WINDOW_MS : tab === 'trending' ? n.favorites >= 250 : true,
      )
      .filter((n) => (!minPrice || compare(n.price, minPrice) >= 0) && (!maxPrice || compare(n.price, maxPrice) <= 0))

    // Facet counts apply every other active filter, so combining filters stays predictable.
    const inCategory = (n: Nft) => !categories.length || categories.includes(n.category)
    const inNetwork = (n: Nft) => !networks.length || networks.includes(n.network)

    const sorted = base
      .filter((n) => inCategory(n) && inNetwork(n))
      .sort((a, b) => {
        if (sort === 'price-asc') return compare(a.price, b.price) || a.id.localeCompare(b.id)
        if (sort === 'price-desc') return compare(b.price, a.price) || a.id.localeCompare(b.id)
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (tab === 'trending') return b.favorites - a.favorites
        return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      })

    const total = sorted.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(Number(p.get('page')) || 1, 1), totalPages)
    const prices = all.map((n) => n.price).sort(compare)

    const body: NftListResponse = {
      items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
      page,
      pageSize,
      total,
      totalPages,
      facets: {
        categories: CATEGORIES.map((id) => ({ id, count: base.filter((n) => n.category === id && inNetwork(n)).length })),
        networks: NETWORKS.map((id) => ({ id, count: base.filter((n) => n.network === id && inCategory(n)).length })),
        priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
      },
    }
    return HttpResponse.json(body)
  }),

  route<{ id: string }>('get', '/nfts/:id', 'detail', ({ params }) => {
    const nft = findNft(params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),
]
