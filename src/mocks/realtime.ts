import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, RealtimeEnvelope } from '@/api/types'
import { commit, db, initDb, nextId } from './db'
import { getScenario } from './scenarios'

/**
 * Socket.IO "server" running inside MSW. socket.io-client opens a real WebSocket
 * (transport: websocket only); MSW intercepts it and @mswjs/socket.io-binding
 * encodes/decodes the Engine.IO + Socket.IO framing. See ARCHITECTURE.md › Realtime.
 */

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.local'

interface Peer {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  userId: string | null
}

const peers = new Set<Peer>()
let offlineUntil = 0

// MSW strips the "/socket.io/" prefix from client URLs before matching, so link the origin.
const link = ws.link(SOCKET_URL)

export const realtimeHandler = link.addEventListener('connection', async ({ client }) => {
  await initDb()
  if (getScenario() === 'offline' || Date.now() < offlineUntil) {
    // Refuse like an unreachable server: "error" then "close". Without the error event the
    // Socket.IO Manager never schedules its next reconnection attempt.
    queueMicrotask(() => {
      // `socket` exists on the concrete connection (MSW uses it the same way) but not on the public type.
      ;(client as unknown as { socket: EventTarget }).socket.dispatchEvent(new Event('error'))
      client.close()
    })
    return
  }

  const io = toSocketIo({ client } as Parameters<typeof toSocketIo>[0])
  const peer: Peer = { io, close: () => client.close(), userId: null }
  peers.add(peer)

  // The binding advertises pingInterval 25s; without pings the client drops after ~30s.
  const ping = setInterval(() => client.send('2'), 20_000)
  client.addEventListener('close', () => {
    clearInterval(ping)
    peers.delete(peer)
  })

  // Handshake auth is ignored by the binding, so the session is bound with an explicit event.
  io.client.on('session.auth', (_event, payload: { token: string | null }) => {
    const session = db().sessions.find((s) => s.token === payload?.token && Date.parse(s.expiresAt) > Date.now())
    peer.userId = session?.userId ?? null
    io.client.emit('session.ready', { userId: peer.userId })
  })
})

function remember(event: RealtimeEnvelope<string, string, unknown>) {
  const s = db()
  s.events = [...s.events, event].slice(-50)
  commit()
}

export function emitNftUpdated(nft: Nft) {
  const event: NftUpdatedEvent = {
    id: nextId('evt'),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { price: nft.price, compareAtPrice: nft.compareAtPrice, soldOut: nft.soldOut, editions: nft.editions },
  }
  remember(event)
  // Public resource: broadcast to every connection.
  peers.forEach((p) => p.io.client.emit('nft.updated', event))
}

export function emitOrderUpdated(userId: string, order: Order) {
  const event: OrderUpdatedEvent = {
    id: nextId('evt'),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: { userId, order },
  }
  remember(event)
  // Private resource: only connections authenticated as the owner receive it.
  peers.forEach((p) => p.userId === userId && p.io.client.emit('order.updated', event))
}

/** Re-sends stored events verbatim (duplicates) and then older versions of them. */
export function replayEvents(count = 5) {
  const recent = db().events.slice(-count)
  for (const event of [...recent, ...recent.slice().reverse()]) {
    if (event.type === 'nft.updated') {
      peers.forEach((p) => p.io.client.emit('nft.updated', event as NftUpdatedEvent))
    } else if (event.type === 'order.updated') {
      const e = event as OrderUpdatedEvent
      peers.forEach((p) => p.userId === e.data.userId && p.io.client.emit('order.updated', e))
    }
  }
  return recent.length
}

/** Drops every connection and refuses reconnection for `ms` milliseconds. */
export function dropConnections(ms: number) {
  offlineUntil = Date.now() + ms
  peers.forEach((p) => p.close())
}

/** Closes connections bound to a user (logout / session expiry on the server). */
export function dropUserConnections(userId: string) {
  peers.forEach((p) => p.userId === userId && p.close())
}
