import { z } from 'zod'
import { CATEGORIES, NETWORKS, SORTS, TABS, type NftListParams } from '@/api/types'

const price = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d+(\.\d+)?$/))

/**
 * Catalog state lives in the URL: survives refresh, back/forward and sharing.
 * Invalid values are dropped (.catch) instead of breaking the page.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  category: z.array(z.enum(CATEGORIES)).optional().catch(undefined),
  network: z.array(z.enum(NETWORKS)).optional().catch(undefined),
  minPrice: price.optional().catch(undefined),
  maxPrice: price.optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined),
  tab: z.enum(TABS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const PAGE_SIZE = 9

/** Only catalog keys reach the API/query key (the URL also carries e.g. ?auth=entrar). */
export function toListParams(search: CatalogSearch): NftListParams {
  const { q, category, network, minPrice, maxPrice, sort, tab, page } = search
  return { q, category, network, minPrice, maxPrice, sort, tab, page: page ?? 1, pageSize: PAGE_SIZE }
}

/** Any filter change returns to page 1. */
export function withFilter(prev: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  const next = { ...prev, ...patch, page: undefined }
  for (const key of Object.keys(next) as (keyof CatalogSearch)[]) {
    const value = next[key]
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key]
  }
  return next
}

export function toggle<T>(list: T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}
