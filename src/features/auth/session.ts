import type { QueryClient } from '@tanstack/react-query'
import { api, qk } from '@/api/endpoints'
import { guestCart, sessionStore } from '@/api/session-store'
import type { Session } from '@/api/types'

/**
 * Starts a session and moves the visitor's cart into the account.
 * A different user already signed in is logged out first, so no private cache survives.
 */
export async function completeLogin(session: Session, queryClient: QueryClient) {
  const current = sessionStore.get()
  if (current && current.user.id !== session.user.id) sessionStore.end('logout')

  const guestCartId = guestCart.get()
  sessionStore.start(session)
  const cartKey = qk.cart(session.user.id)
  try {
    const merged = await api.cart.merge(guestCartId)
    // Starting the session already fired a cart fetch that may have read the pre-merge
    // (empty) cart: store the merged result and refetch, cancelling that stale request.
    queryClient.setQueryData(cartKey, merged)
  } catch {
    // The account cart still loads; the visitor cart stays on the server until next login.
    return
  } finally {
    void queryClient.invalidateQueries({ queryKey: cartKey })
  }
  guestCart.set(null)
  queryClient.removeQueries({ queryKey: ['guest'] })
}

export async function logout() {
  try {
    await api.auth.logout()
  } catch {
    // Server-side session may already be gone (expired); local cleanup still happens.
  }
  sessionStore.end('logout')
}
