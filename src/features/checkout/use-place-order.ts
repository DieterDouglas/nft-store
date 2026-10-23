import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, toApiError } from '@/api/client'
import { api, qk } from '@/api/endpoints'
import type { CreateOrderRequest, Order } from '@/api/types'
import { useUserId } from '@/hooks/use-session'
import { checkoutStorage, newIdempotencyKey } from './order-attempt'

const MAX_ATTEMPTS = 3
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Places an order exactly once:
 * - the idempotency key is persisted *before* the first request;
 * - timeouts / connection failures are retried with the same key and body, so the
 *   server returns the order it already created instead of creating another;
 * - business conflicts (stale quote, availability) end the attempt so the next
 *   confirmation uses a fresh key.
 */
export function usePlaceOrder({ onPlaced }: { onPlaced: (order: Order) => void }) {
  const userId = useUserId()!
  const queryClient = useQueryClient()
  const inFlight = useRef(false)
  const [retrying, setRetrying] = useState(0)

  const mutation = useMutation({
    mutationFn: async (body: CreateOrderRequest): Promise<Order> => {
      const stored = checkoutStorage.attempt(userId)
      // Reuse the stored key only for the same payload; a different payload is a new attempt.
      const attempt = stored && JSON.stringify(stored.body) === JSON.stringify(body) ? stored : { key: newIdempotencyKey(), body }
      checkoutStorage.saveAttempt(userId, attempt)

      let lastError: ApiError | null = null
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
          return await api.checkout.createOrder(attempt.body, attempt.key)
        } catch (error) {
          lastError = toApiError(error)
          if (!lastError.isTransient) break
          setRetrying(i + 1)
          await sleep(800 * (i + 1))
        }
      }
      // Business rejections close the attempt; transient failures keep it for a later retry/reload.
      if (lastError && !lastError.isTransient) checkoutStorage.saveAttempt(userId, null)
      throw lastError
    },
    // Hook-level callback: still runs if the screen unmounted meanwhile (e.g. the order
    // settled and emptied the cart before the slow response arrived).
    onSuccess: (order) => {
      checkoutStorage.saveAttempt(userId, null)
      queryClient.setQueryData(qk.order(userId, order.id), order)
      onPlaced(order)
    },
    onSettled: () => {
      inFlight.current = false
      setRetrying(0)
    },
  })

  return {
    ...mutation,
    retrying,
    /** Ignores repeated clicks while a submission is in flight. */
    place(body: CreateOrderRequest, options?: Parameters<typeof mutation.mutate>[1]) {
      if (inFlight.current) return
      inFlight.current = true
      mutation.mutate(body, options)
    },
  }
}
