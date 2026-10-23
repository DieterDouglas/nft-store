import type { Nft, Order, Quote, RealtimeEnvelope, User, Wallet } from '@/api/types'
import { buildNfts, SEED_COUPONS, SEED_USERS } from './fixtures'

/**
 * In-browser "backend" state. Every mutation goes through commit(), which persists to
 * localStorage so the mock server survives refresh. resetDb() restores the seed exactly.
 */

const STORAGE_KEY = 'kurio.mockdb.v2'
export const SESSION_TTL_MS = 60 * 60 * 1000

export interface MockUser extends User {
  passwordHash: string
  salt: string
}

export interface MockCartLine {
  id: string
  nftId: string
  editionId: string
  quantity: number
  priceAtAdd: string
}

export interface MockCart {
  id: string
  ownerId: string | null
  lines: MockCartLine[]
  couponCode: string | null
  updatedAt: string
}

export interface MockOrder {
  order: Order
  userId: string
  cartId: string
  requestHash: string
  /** Epoch ms when the simulated chain settles the payment. */
  settleAt: number
  outcome: 'confirmed' | 'declined'
}

export interface DbState {
  schema: 2
  seq: number
  users: MockUser[]
  sessions: { token: string; userId: string; expiresAt: string }[]
  nfts: Nft[]
  favorites: Record<string, string[]>
  carts: Record<string, MockCart>
  quotes: Record<string, { quote: Quote; cartId: string; userId: string | null }>
  orders: Record<string, MockOrder>
  idempotency: Record<string, { userId: string; requestHash: string; orderId: string }>
  wallets: Record<string, Wallet[]>
  coupons: { code: string; percentOff: number; expiresAt: string }[]
  /** Last emitted realtime events, kept for the "replay duplicates/old events" scenario. */
  events: RealtimeEnvelope<string, string, unknown>[]
}

let state: DbState | null = null

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function seed(): Promise<DbState> {
  const users = await Promise.all(
    SEED_USERS.map(async ({ password, ...u }) => {
      const salt = `salt-${u.id}`
      return { ...u, avatarUrl: null, createdAt: '2026-01-15T10:00:00.000Z', salt, passwordHash: await hashPassword(password, salt) }
    }),
  )
  return {
    schema: 2,
    seq: 1000,
    users,
    sessions: [],
    nfts: buildNfts(),
    favorites: { 'usr-ana': ['nft-003', 'nft-007'] },
    carts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: {
      'usr-ana': [
        {
          id: 'wal-ana-1',
          role: 'primary',
          label: 'MetaMask principal',
          provider: 'metamask',
          address: '0x8f3a1c9e2b7d4a6f0e1c3b5d7a9f2e4c6b8d0a1f',
          network: 'ethereum',
          displayName: 'Ana Colecionadora',
          profileName: 'ana.coleciona',
          email: 'ana@kurio.dev',
          ensName: 'anacoleciona',
          altAddress: null,
          referralCode: null,
          updatedAt: '2026-02-01T10:00:00.000Z',
        },
        {
          id: 'wal-ana-2',
          role: 'secondary',
          label: 'Coinbase reserva',
          provider: 'coinbase',
          address: '0x2b4d6f8a0c1e3a5c7e9b1d3f5a7c9e0b2d4f6a8c',
          network: 'polygon',
          displayName: 'Ana Colecionadora',
          profileName: 'ana.coleciona',
          email: 'ana@kurio.dev',
          ensName: null,
          altAddress: null,
          referralCode: null,
          updatedAt: '2026-02-01T10:00:00.000Z',
        },
      ],
    },
    coupons: SEED_COUPONS,
    events: [],
  }
}

export async function initDb(): Promise<DbState> {
  if (state) return state
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as DbState) : null
    if (parsed?.schema === 2) state = parsed
  } catch {
    // Corrupt or unavailable storage: fall through to a fresh seed.
  }
  state ??= await seed()
  commit()
  return state
}

export function db(): DbState {
  if (!state) throw new Error('Mock DB used before initDb()')
  return state
}

export function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full/blocked: the mock keeps working in memory for this page load.
  }
}

export async function resetDb() {
  state = await seed()
  commit()
}

/** Deterministic ids: same sequence of operations yields the same ids after a reset. */
export function nextId(prefix: string) {
  const s = db()
  s.seq += 1
  return `${prefix}-${s.seq}`
}

export function publicUser(user: MockUser): User {
  const { passwordHash: _h, salt: _s, ...rest } = user
  return rest
}

export function findNft(id: string) {
  return db().nfts.find((n) => n.id === id)
}

/** Stable JSON hash used for idempotency payload comparison and quote fingerprints. */
export function stableHash(value: unknown): string {
  const json = JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )
  let h = 0x811c9dc5
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
