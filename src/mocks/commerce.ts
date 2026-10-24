import type { Cart, CartLine, CartLineIssue, Edition, Network, Nft, NftSummary, Quote } from '@/api/types'
import { add, compare, mul, percentOf, sub } from '@/lib/money'
import { commit, db, findNft, nextId, stableHash, type MockCart, type MockOrder } from './db'
import { lowestPrice, NETWORK_FEES } from './fixtures'
import { emitNftUpdated, emitOrderUpdated } from './realtime'

export const toSummary = ({ id, name, image, category, network, price, compareAtPrice, rarity, soldOut, createdAt, version }: Nft): NftSummary => ({
  id,
  name,
  image,
  category,
  network,
  price,
  compareAtPrice,
  rarity,
  soldOut,
  createdAt,
  version,
})

export function updateEdition(nftId: string, editionId: string | undefined, patch: Partial<Pick<Edition, 'price' | 'available'>>) {
  const nft = findNft(nftId)
  if (!nft) return null
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  Object.assign(edition, patch)
  nft.price = lowestPrice(nft.editions)
  nft.soldOut = nft.editions.every((e) => e.available === 0)
  nft.version += 1
  commit()
  emitNftUpdated(nft)
  return nft
}

export function userCartId(userId: string) {
  return `cart-u-${userId}`
}

/** Client-minted visitor cart ids (see guestCart.ensure). */
const GUEST_CART_ID = /^cart-g-[0-9a-f-]{36}$/

export function getOrCreateCart(userId: string | null, guestCartId: string | null): MockCart {
  const s = db()
  const usableGuestId = guestCartId && GUEST_CART_ID.test(guestCartId) && (s.carts[guestCartId]?.ownerId ?? null) === null
  const id = userId ? userCartId(userId) : usableGuestId ? guestCartId : nextId('cart-g')
  s.carts[id] ??= { id, ownerId: userId, lines: [], couponCode: null, updatedAt: new Date().toISOString() }
  return s.carts[id]
}

function lineIssues(quantity: number, unitPrice: string, priceAtAdd: string, available: number): CartLineIssue[] {
  const issues: CartLineIssue[] = []
  if (compare(unitPrice, priceAtAdd) !== 0) issues.push('price-changed')
  if (available === 0) issues.push('sold-out')
  else if (quantity > available) issues.push('insufficient')
  return issues
}

export function viewCart(cart: MockCart): Cart {
  const items: CartLine[] = cart.lines.flatMap((line) => {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: line.id,
        nftId: nft.id,
        editionId: edition.id,
        quantity: line.quantity,
        name: nft.name,
        image: nft.image,
        tokenId: nft.tokenId,
        editionLabel: edition.label,
        editionShortLabel: edition.shortLabel,
        network: nft.network,
        unitPrice: edition.price,
        priceAtAdd: line.priceAtAdd,
        available: edition.available,
        maxPerOrder: edition.maxPerOrder,
        issues: lineIssues(line.quantity, edition.price, line.priceAtAdd, edition.available),
      },
    ]
  })
  return {
    id: cart.id,
    items,
    couponCode: cart.couponCode,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    updatedAt: cart.updatedAt,
  }
}

export function touch(cart: MockCart) {
  cart.updatedAt = new Date().toISOString()
  commit()
}

/** Login: guest lines are merged into the user's cart, clamped to availability and per-order limits. */
export function mergeCarts(guestCartId: string | null, userId: string) {
  const s = db()
  const target = getOrCreateCart(userId, null)
  const guest = guestCartId ? s.carts[guestCartId] : undefined
  if (!guest || guest.ownerId !== null) return target
  for (const line of guest.lines) {
    const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
    if (!edition) continue
    const existing = target.lines.find((l) => l.nftId === line.nftId && l.editionId === line.editionId)
    const limit = Math.min(edition.maxPerOrder, Math.max(edition.available, 1))
    if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, limit)
    else target.lines.push({ ...line, id: nextId('line'), quantity: Math.min(line.quantity, limit) })
  }
  target.couponCode ??= guest.couponCode
  delete s.carts[guest.id]
  touch(target)
  return target
}

export function findCoupon(code: string) {
  return db().coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase())
}

export function couponState(code: string): 'valid' | 'expired' | 'invalid' {
  const coupon = findCoupon(code)
  if (!coupon) return 'invalid'
  return Date.parse(coupon.expiresAt) <= Date.now() ? 'expired' : 'valid'
}

export function networkFee(network: Network, units: number): string {
  if (units === 0) return '0'
  const fee = NETWORK_FEES[network]
  return add(fee.base, mul(fee.perUnit, units - 1))
}

export function buildQuote(cart: MockCart, network: Network): Quote {
  const view = viewCart(cart)
  const lines = view.items.map((i) => ({
    nftId: i.nftId,
    editionId: i.editionId,
    name: i.name,
    image: i.image,
    tokenId: i.tokenId,
    editionLabel: i.editionLabel,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: mul(i.unitPrice, i.quantity),
  }))
  const subtotal = add('0', ...lines.map((l) => l.lineTotal))
  const coupon = cart.couponCode && couponState(cart.couponCode) === 'valid' ? findCoupon(cart.couponCode)! : null
  const discount = coupon ? percentOf(subtotal, coupon.percentOff) : '0'
  const fee = networkFee(network, view.itemCount)
  const total = add(sub(subtotal, discount), fee)
  const issues = view.items.flatMap((i) => i.issues.filter((x) => x !== 'price-changed').map((issue) => ({ lineId: i.id, issue })))
  const fingerprint = stableHash({
    lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice]),
    coupon: coupon?.code ?? null,
    network,
    fee,
  })
  const now = Date.now()
  return {
    id: nextId('quo'),
    lines,
    network,
    coupon: coupon ? { code: coupon.code, percentOff: coupon.percentOff } : null,
    subtotal,
    discount,
    networkFee: fee,
    total,
    fingerprint,
    issues,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
  }
}

function fakeHash(seed: string) {
  let out = '0x'
  let h = 0x9e3779b9
  while (out.length < 66) {
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x85ebca6b) + out.length
    out += (h >>> 0).toString(16).padStart(8, '0')
  }
  return out.slice(0, 66)
}

/** Moves a pending order to its terminal state. Terminal orders never change again. */
export function settleOrder(mo: MockOrder) {
  if (mo.order.status !== 'pending') return
  const s = db()
  const now = new Date().toISOString()
  if (mo.outcome === 'confirmed') {
    const hash = fakeHash(mo.order.id)
    mo.order = {
      ...mo.order,
      status: 'confirmed',
      transaction: { hash, explorerUrl: `https://explorer.kurio.local/tx/${hash}` },
    }
    // Remove only what was purchased; anything added meanwhile stays in the cart.
    const cart = s.carts[mo.cartId]
    if (cart) {
      for (const bought of mo.order.receipt.lines) {
        const line = cart.lines.find((l) => l.nftId === bought.nftId && l.editionId === bought.editionId)
        if (line) line.quantity -= bought.quantity
      }
      cart.lines = cart.lines.filter((l) => l.quantity > 0)
      if (mo.order.receipt.coupon && cart.couponCode === mo.order.receipt.coupon.code) cart.couponCode = null
      touch(cart)
    }
  } else {
    mo.order = { ...mo.order, status: 'declined', declineReason: 'Pagamento recusado pela carteira: saldo insuficiente (simulado).' }
    // Release reserved units.
    for (const line of mo.order.receipt.lines) {
      const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
      if (edition) updateEdition(line.nftId, line.editionId, { available: edition.available + line.quantity })
    }
  }
  mo.order.version += 1
  mo.order.updatedAt = now
  commit()
  emitOrderUpdated(mo.userId, mo.order)
}

export function settleDueOrders() {
  const now = Date.now()
  Object.values(db().orders).forEach((mo) => mo.order.status === 'pending' && mo.settleAt <= now && settleOrder(mo))
}
