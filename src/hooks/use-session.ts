import { useSyncExternalStore } from 'react'
import { sessionStore } from '@/api/session-store'

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
}

/** Current user id, or null for visitors. Used to scope private query keys. */
export function useUserId() {
  return useSession()?.user.id ?? null
}
