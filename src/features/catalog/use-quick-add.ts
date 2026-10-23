import { useQueryClient } from '@tanstack/react-query'
import type { NftSummary } from '@/api/types'
import { useAddToCart } from '@/features/cart/hooks'
import { compare } from '@/lib/money'
import { nftQuery } from './hooks'

/** Cards only carry the summary: resolve the cheapest available edition, then add one unit. */
export function useQuickAdd() {
  const queryClient = useQueryClient()
  const addToCart = useAddToCart()
  return {
    isPending: addToCart.isPending,
    async add(nft: NftSummary) {
      const detail = await queryClient.fetchQuery(nftQuery(nft.id))
      const edition = detail.editions.filter((e) => e.available > 0).sort((a, b) => compare(a.price, b.price))[0]
      if (edition) addToCart.mutate({ nftId: nft.id, editionId: edition.id, quantity: 1, name: `${nft.name} (${edition.shortLabel})` })
    },
  }
}
