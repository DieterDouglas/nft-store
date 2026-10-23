import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import { qk } from '@/api/endpoints'
import type { ClientToServerEvents, Nft, NftListResponse, NftUpdatedEvent, Order, OrderUpdatedEvent, ServerToClientEvents } from '@/api/types'

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.local'

type KurioSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'

/** App-level notifications derived from realtime events (cart/checkout banners, live region). */
export type RealtimeNotice =
  | { kind: 'nft-changed'; event: NftUpdatedEvent; name: string }
  | { kind: 'order-changed'; order: Order }

type Listener<T> = (value: T) => void

function emitter<T>() {
  const listeners = new Set<Listener<T>>()
  return {
    emit: (value: T) => listeners.forEach((l) => l(value)),
    subscribe: (l: Listener<T>) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}

export const notices = emitter<RealtimeNotice>()

let connectionState: ConnectionState = 'connecting'
const connectionEvents = emitter<ConnectionState>()
export const connection = {
  get: () => connectionState,
  subscribe: (l: () => void) => connectionEvents.subscribe(l),
}
function setConnection(next: ConnectionState) {
  connectionState = next
  connectionEvents.emit(next)
}

/**
 * Dedupe + ordering guard. Event ids are remembered (bounded) so duplicates are no-ops;
 * per-resource versions make late/older events no-ops too.
 */
export class EventGuard {
  private seen = new Set<string>()
  private versions = new Map<string, number>()

  accept(event: { id: string; resource: { type: string; id: string }; version: number }) {
    if (this.seen.has(event.id)) return false
    this.seen.add(event.id)
    if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value!)
    const key = `${event.resource.type}:${event.resource.id}`
    if ((this.versions.get(key) ?? 0) >= event.version) return false
    this.versions.set(key, event.version)
    return true
  }
}

function applyNftUpdate(queryClient: QueryClient, event: NftUpdatedEvent) {
  const patch = <T extends { id: string; version: number }>(item: T): T =>
    item.id === event.resource.id && item.version < event.version
      ? { ...item, ...event.data, version: event.version }
      : item

  queryClient.setQueryData<Nft>(qk.nft(event.resource.id), (old) => (old ? patch(old) : old))
  queryClient.setQueriesData<NftListResponse>({ queryKey: ['nfts', 'list'] }, (old) =>
    old ? { ...old, items: old.items.map((i) => patch(i as Nft)) } : old,
  )
  // Cart lines and quotes are recomputed server-side (issues, totals): refetch them.
  void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('cart') })
}

/**
 * Opens one Socket.IO connection bound to the given session token.
 * Returns a disposer that removes every listener and closes the socket.
 */
export function connectRealtime(queryClient: QueryClient, session: { token: string; userId: string } | null) {
  const guard = new EventGuard()
  const socket: KurioSocket = io(SOCKET_URL, {
    // The MSW binding intercepts WebSocket only; long-polling would bypass it.
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
  let hasConnectedBefore = false

  setConnection('connecting')

  socket.on('connect', () => {
    socket.emit('session.auth', { token: session?.token ?? null })
    setConnection('connected')
    if (hasConnectedBefore) {
      // Reconnected: events may have been missed, so REST becomes the source of truth again.
      void queryClient.invalidateQueries({ queryKey: ['nfts'], refetchType: 'active' })
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('cart') || q.queryKey.includes('orders') })
    }
    hasConnectedBefore = true
  })

  socket.on('disconnect', (reason) => {
    // "io client disconnect" = we closed it on purpose (logout/unmount).
    setConnection(reason === 'io client disconnect' ? 'offline' : 'reconnecting')
  })
  socket.io.on('reconnect_attempt', () => setConnection('reconnecting'))

  socket.on('nft.updated', (event) => {
    if (!guard.accept(event)) return
    const name = queryClient.getQueryData<Nft>(qk.nft(event.resource.id))?.name ?? findNameInLists(queryClient, event.resource.id)
    applyNftUpdate(queryClient, event)
    notices.emit({ kind: 'nft-changed', event, name: name ?? 'Um NFT' })
  })

  socket.on('order.updated', (event: OrderUpdatedEvent) => {
    // Events addressed to another account are never applied.
    if (!session || event.data.userId !== session.userId) return
    if (!guard.accept(event)) return
    const key = qk.order(session.userId, event.resource.id)
    const cached = queryClient.getQueryData<Order>(key)
    if (cached && cached.version >= event.version) return
    queryClient.setQueryData(key, event.data.order)
    if (event.data.order.status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: qk.cart(session.userId) })
    }
    notices.emit({ kind: 'order-changed', order: event.data.order })
  })

  return () => {
    socket.removeAllListeners()
    socket.io.removeAllListeners()
    socket.disconnect()
  }
}

function findNameInLists(queryClient: QueryClient, id: string) {
  for (const [, data] of queryClient.getQueriesData<NftListResponse>({ queryKey: ['nfts', 'list'] })) {
    const hit = data?.items.find((i) => i.id === id)
    if (hit) return hit.name
  }
  return undefined
}
