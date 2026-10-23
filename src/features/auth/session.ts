import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
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
  try {
    await api.cart.merge(guestCartId)
  } catch {
    // The account cart still loads; the visitor cart stays on the server until next login.
    return
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
