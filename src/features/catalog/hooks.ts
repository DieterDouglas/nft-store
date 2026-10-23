import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { api, qk } from '@/api/endpoints'
import type { NftListParams } from '@/api/types'

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: qk.nftList(params),
    // The signal aborts superseded requests; the key isolates each param set, so a late
    // response can never overwrite the list for the current filters.
    queryFn: ({ signal }) => api.nfts.list(params, { signal }),
    placeholderData: keepPreviousData,
  })

export const nftQuery = (id: string) =>
  queryOptions({
    queryKey: qk.nft(id),
    queryFn: ({ signal }) => api.nfts.detail(id, { signal }),
  })

export const useNftList = (params: NftListParams) => useQuery(nftListQuery(params))
export const useNft = (id: string) => useQuery(nftQuery(id))
