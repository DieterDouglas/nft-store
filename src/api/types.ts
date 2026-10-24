/**
 * REST + realtime contracts shared by the Axios client, TanStack Query hooks,
 * UI components and the MSW mock server. Documented in ARCHITECTURE.md.
 *
 * Money: ETH amounts always travel as decimal strings ("1.19") and are only
 * computed with decimal.js (see lib/money.ts). Quantities are integers.
 */

export type Eth = string

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export type Network = (typeof NETWORKS)[number]

export const CATEGORIES = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export type Category = (typeof CATEGORIES)[number]

export const SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export type Sort = (typeof SORTS)[number]

export const TABS = ['all', 'new', 'trending'] as const
export type CatalogTab = (typeof TABS)[number]

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'AVAILABILITY_CONFLICT'
  | 'QUOTE_STALE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'WALLET_REJECTED'
  | 'TRANSIENT'
  | 'INTERNAL'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Field-level validation messages, keyed by form field name. */
    fields?: Record<string, string>
    details?: unknown
  }
}

export interface Edition {
  id: string
  label: string
  /** Pill label shown in the layout: "1/1", "1/10", "1/50" or "ABERTA". */
  shortLabel: string
  price: Eth
  /** Previous price, shown struck through when present. */
  compareAtPrice?: Eth
  /** Units still for sale. 0 = sold out. */
  available: number
  supply: number
  maxPerOrder: number
}

export interface NftSummary {
  id: string
  name: string
  image: string
  category: Category
  network: Network
  /** Lowest current edition price. */
  price: Eth
  compareAtPrice?: Eth
  rarity?: 'raro' | 'lendario'
  soldOut: boolean
  createdAt: string
  /** Monotonic resource version; bumped on every price/availability change. */
  version: number
}

export interface Review {
  id: string
  author: string
  rating: number
  text: string
  createdAt: string
}

export interface Nft extends NftSummary {
  /** Display token id, e.g. "#0042". */
  tokenId: string
  collection: string
  description: string
  creator: { name: string; handle: string }
  gallery: string[]
  editions: Edition[]
  favorites: number
  traits: string[]
  contract: { address: string; standard: string; royaltyPercent: number }
  rating: { average: number; count: number }
  reviews: Review[]
}

export interface NftListParams {
  q?: string
  category?: Category[]
  network?: Network[]
  minPrice?: string
  maxPrice?: string
  sort?: Sort
  tab?: CatalogTab
  page?: number
  pageSize?: number
}

export interface Facet<T extends string> {
  id: T
  count: number
}

export interface NftListResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    categories: Facet<Category>[]
    networks: Facet<Network>[]
    priceRange: { min: Eth; max: Eth }
  }
}

export interface User {
  id: string
  /** "Nome de exibição" */
  name: string
  username: string
  email: string
  /** ENS name without the ".eth" suffix, or null. */
  ensName: string | null
  /** "Apelido da carteira" shown across the account area. */
  walletNickname: string
  avatarUrl: string | null
  createdAt: string
}

export interface Session {
  token: string
  expiresAt: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

/** Mobile frame "Criar perfil de colecionador": username, e-mail and password. */
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  name: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]
export type WalletRole = 'primary' | 'secondary'

/** Wallet slot plus the collector identity used when paying with it (Figma "Carteiras"). */
export interface WalletDetails {
  /** "Apelido da carteira" */
  label: string
  provider: WalletProvider
  address: string
  network: Network
  /** "Nome de exibição" */
  displayName: string
  /** "Nome do perfil" */
  profileName: string
  email: string
  ensName: string | null
  /** "ENS ou carteira secundária (opcional)" */
  altAddress: string | null
  referralCode: string | null
}

export interface Wallet extends WalletDetails {
  id: string
  role: WalletRole
  updatedAt: string
}

export type UpsertWalletRequest = WalletDetails

export interface WalletConnection {
  walletId: string
  status: 'connected'
  network: Network
  connectedAt: string
}

export type CartLineIssue = 'price-changed' | 'insufficient' | 'sold-out'

export interface CartLine {
  id: string
  nftId: string
  editionId: string
  quantity: number
  name: string
  image: string
  tokenId: string
  editionLabel: string
  /** "1/50", "ABERTA"… (mobile cart shows "Edição: 1/50"). */
  editionShortLabel: string
  network: Network
  unitPrice: Eth
  /** Price when the line was added/last acknowledged. */
  priceAtAdd: Eth
  available: number
  maxPerOrder: number
  issues: CartLineIssue[]
}

export interface Cart {
  id: string
  items: CartLine[]
  couponCode: string | null
  itemCount: number
  updatedAt: string
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface Quote {
  id: string
  lines: Array<{
    nftId: string
    editionId: string
    name: string
    image: string
    tokenId: string
    editionLabel: string
    quantity: number
    unitPrice: Eth
    lineTotal: Eth
  }>
  network: Network
  coupon: { code: string; percentOff: number } | null
  subtotal: Eth
  discount: Eth
  networkFee: Eth
  total: Eth
  /** Hash of prices, quantities, coupon and fee. Orders must reference a current fingerprint. */
  fingerprint: string
  issues: Array<{ lineId: string; issue: CartLineIssue }>
  createdAt: string
  expiresAt: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface CreateOrderRequest {
  quoteId: string
  fingerprint: string
  walletId: string
  network: Network
  buyer: Buyer
}

/** "Perfil do colecionador" block of the payment page. */
export interface Buyer {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string | null
  referralCode: string | null
  note: string | null
}

export interface Order {
  id: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  /** Immutable snapshot taken at creation; later catalog changes never alter it. */
  receipt: {
    lines: Quote['lines']
    coupon: Quote['coupon']
    subtotal: Eth
    discount: Eth
    networkFee: Eth
    total: Eth
    network: Network
    wallet: { label: string; address: string; provider: WalletProvider }
    buyer: CreateOrderRequest['buyer']
  }
  transaction: { hash: string; explorerUrl: string } | null
  declineReason: string | null
}

export interface RealtimeEnvelope<TType extends string, TResource extends string, TData> {
  /** Stable, unique event id (dedupe key). */
  id: string
  type: TType
  resource: { type: TResource; id: string }
  /** Resource version after this change. Older-or-equal versions are ignored. */
  version: number
  occurredAt: string
  data: TData
}

export type NftUpdatedEvent = RealtimeEnvelope<
  'nft.updated',
  'nft',
  { price: Eth; compareAtPrice?: Eth; soldOut: boolean; editions: Edition[] }
>

export type OrderUpdatedEvent = RealtimeEnvelope<
  'order.updated',
  'order',
  { userId: string; order: Order }
>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'session.ready': (payload: { userId: string | null }) => void
}

export interface ClientToServerEvents {
  'session.auth': (payload: { token: string | null }) => void
}
