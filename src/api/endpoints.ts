import { guestCart } from './session-store'
import { ORDER_TIMEOUT_MS, request } from './client'
import type {
  AddCartItemRequest,
  Cart,
  ChangePasswordRequest,
  CreateOrderRequest,
  LoginRequest,
  Network,
  Nft,
  NftListParams,
  NftListResponse,
  NftSummary,
  Order,
  Quote,
  RegisterRequest,
  Session,
  UpdateProfileRequest,
  UpsertWalletRequest,
  User,
  Wallet,
  WalletConnection,
  WalletRole,
} from './types'

type Opts = { signal?: AbortSignal }

/** Arrays are sent as repeated keys: ?category=a&category=b */
function listQuery(params: NftListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === null) continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)))
    else search.set(key, String(value))
  }
  return search
}

/** Guest carts are identified by the id the server hands back on first use. */
function rememberGuestCart(cart: Cart, authenticated: boolean) {
  if (!authenticated) guestCart.set(cart.id)
  return cart
}

export const api = {
  nfts: {
    list: (params: NftListParams, { signal }: Opts = {}) =>
      request<NftListResponse>({ url: '/nfts', params: listQuery(params), signal }),
    detail: (id: string, { signal }: Opts = {}) => request<Nft>({ url: `/nfts/${encodeURIComponent(id)}`, signal }),
  },

  auth: {
    login: (body: LoginRequest) => request<Session>({ method: 'POST', url: '/auth/login', data: body }),
    register: (body: RegisterRequest) => request<Session>({ method: 'POST', url: '/auth/register', data: body }),
    session: ({ signal }: Opts = {}) => request<Session>({ url: '/auth/session', signal }),
    logout: () => request<void>({ method: 'POST', url: '/auth/logout' }),
  },

  profile: {
    get: ({ signal }: Opts = {}) => request<User>({ url: '/me', signal }),
    update: (body: UpdateProfileRequest) => request<User>({ method: 'PUT', url: '/me', data: body }),
    avatar: (dataUrl: string | null) => request<User>({ method: 'PUT', url: '/me/avatar', data: { dataUrl } }),
    password: (body: ChangePasswordRequest) => request<void>({ method: 'PUT', url: '/me/password', data: body }),
  },

  favorites: {
    list: ({ signal }: Opts = {}) => request<{ ids: string[]; items: NftSummary[] }>({ url: '/favorites', signal }),
    add: (nftId: string) => request<{ ids: string[] }>({ method: 'PUT', url: `/favorites/${nftId}` }),
    remove: (nftId: string) => request<{ ids: string[] }>({ method: 'DELETE', url: `/favorites/${nftId}` }),
  },

  cart: {
    get: (auth: boolean, { signal }: Opts = {}) => request<Cart>({ url: '/cart', signal }).then((c) => rememberGuestCart(c, auth)),
    add: (auth: boolean, body: AddCartItemRequest) =>
      request<Cart>({ method: 'POST', url: '/cart/items', data: body }).then((c) => rememberGuestCart(c, auth)),
    update: (lineId: string, quantity: number) => request<Cart>({ method: 'PATCH', url: `/cart/items/${lineId}`, data: { quantity } }),
    remove: (lineId: string) => request<Cart>({ method: 'DELETE', url: `/cart/items/${lineId}` }),
    acknowledge: () => request<Cart>({ method: 'POST', url: '/cart/acknowledge' }),
    merge: (guestCartId: string | null) => request<Cart>({ method: 'POST', url: '/cart/merge', data: { guestCartId } }),
    applyCoupon: (code: string) => request<Cart>({ method: 'PUT', url: '/cart/coupon', data: { code } }),
    removeCoupon: () => request<Cart>({ method: 'DELETE', url: '/cart/coupon' }),
    quote: (network: Network, { signal }: Opts = {}) => request<Quote>({ url: '/cart/quote', params: { network }, signal }),
  },

  checkout: {
    quote: (network: Network) => request<Quote>({ method: 'POST', url: '/checkout/quote', data: { network } }),
    createOrder: (body: CreateOrderRequest, idempotencyKey: string) =>
      request<Order>({
        method: 'POST',
        url: '/orders',
        data: body,
        headers: { 'Idempotency-Key': idempotencyKey },
        timeout: ORDER_TIMEOUT_MS,
      }),
    order: (id: string, { signal }: Opts = {}) => request<Order>({ url: `/orders/${id}`, signal }),
  },

  wallets: {
    list: ({ signal }: Opts = {}) => request<Wallet[]>({ url: '/wallets', signal }),
    upsert: (role: WalletRole, body: UpsertWalletRequest) => request<Wallet>({ method: 'PUT', url: `/wallets/${role}`, data: body }),
    connect: (id: string, network: Network) => request<WalletConnection>({ method: 'POST', url: `/wallets/${id}/connect`, data: { network } }),
  },
}

/**
 * Query keys. Everything private lives under ['user', userId, ...] so logout / user switch
 * can drop it with one removeQueries call. Params are part of the key (one cache per filter set).
 */
export const qk = {
  nfts: ['nfts'] as const,
  nftList: (params: NftListParams) => ['nfts', 'list', params] as const,
  nft: (id: string) => ['nfts', 'detail', id] as const,
  cart: (userId: string | null) => (userId ? (['user', userId, 'cart'] as const) : (['guest', 'cart'] as const)),
  cartQuote: (userId: string | null, network: Network) => [...qk.cart(userId), 'quote', network] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
}
