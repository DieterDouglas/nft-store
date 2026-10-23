import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, qk } from '@/api/endpoints'
import { toApiError } from '@/api/client'
import type { AddCartItemRequest, Cart, Network } from '@/api/types'
import { useUserId } from '@/hooks/use-session'

export function useCart() {
  const userId = useUserId()
  return useQuery({
    queryKey: qk.cart(userId),
    queryFn: ({ signal }) => api.cart.get(Boolean(userId), { signal }),
  })
}

export function useCartQuote(network: Network, enabled = true) {
  const userId = useUserId()
  return useQuery({
    queryKey: qk.cartQuote(userId, network),
    queryFn: ({ signal }) => api.cart.quote(network, { signal }),
    enabled,
  })
}

/** Every cart mutation returns the full cart: write it to the cache and refresh totals. */
function useCartMutation<TVars>(mutationFn: (vars: TVars) => Promise<Cart>, options: { success?: (vars: TVars) => string } = {}) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(qk.cart(userId), cart)
      void queryClient.invalidateQueries({ queryKey: [...qk.cart(userId), 'quote'] })
      if (options.success) toast.success(options.success(vars))
    },
    onError: (error) => {
      const apiError = toApiError(error)
      // Field errors (coupon form) are rendered inline by the caller.
      if (!Object.keys(apiError.fields).length) toast.error(apiError.message)
      // Availability may have moved under us: resync.
      if (apiError.code === 'AVAILABILITY_CONFLICT') void queryClient.invalidateQueries({ queryKey: qk.cart(userId) })
    },
  })
}

export function useAddToCart() {
  const userId = useUserId()
  return useCartMutation((body: AddCartItemRequest & { name: string }) =>
    api.cart.add(Boolean(userId), { nftId: body.nftId, editionId: body.editionId, quantity: body.quantity }),
    { success: ({ name, quantity }) => `${quantity}× ${name} adicionado ao carrinho.` },
  )
}

export const useUpdateCartLine = () => useCartMutation(({ lineId, quantity }: { lineId: string; quantity: number }) => api.cart.update(lineId, quantity))

export const useRemoveCartLine = () =>
  useCartMutation(({ lineId }: { lineId: string; name: string }) => api.cart.remove(lineId), {
    success: ({ name }) => `${name} removido do carrinho.`,
  })

export const useApplyCoupon = () =>
  useCartMutation((code: string) => api.cart.applyCoupon(code), { success: (code) => `Cupom ${code.toUpperCase()} aplicado.` })

export const useRemoveCoupon = () => useCartMutation(() => api.cart.removeCoupon(), { success: () => 'Cupom removido.' })

export const useAcknowledgePrices = () => useCartMutation(() => api.cart.acknowledge())
