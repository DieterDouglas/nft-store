import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/api/client'

/** Cache/retry policy — documented in ARCHITECTURE.md › Estratégia de cache. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        // Only transient failures are retried; 4xx answers would fail the same way again.
        retry: (failureCount, error) => toApiError(error).isTransient && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
      mutations: {
        // Never auto-repeat writes; order creation has its own idempotent recovery.
        retry: 0,
      },
    },
  })
}
