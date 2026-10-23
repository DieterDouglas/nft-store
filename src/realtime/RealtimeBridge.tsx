import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/use-session'
import { connectRealtime } from './realtime'

/** Owns the socket lifecycle: one connection per session token, torn down on change/unmount. */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null

  useEffect(() => {
    return connectRealtime(queryClient, token && userId ? { token, userId } : null)
  }, [queryClient, token, userId])

  return null
}
