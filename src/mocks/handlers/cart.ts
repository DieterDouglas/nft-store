import { HttpResponse } from 'msw'
import { NETWORKS, type AddCartItemRequest, type Network } from '@/api/types'
import { buildQuote, couponState, getOrCreateCart, mergeCarts, touch, viewCart } from '../commerce'
import { findNft, nextId } from '../db'
import { apiError, readJson, route, validationError, type RouteContext } from '../http'

const guestId = (request: Request) => request.headers.get('x-cart-id')

const cartFor = ({ user, request }: RouteContext<Record<string, string>>) => getOrCreateCart(user?.id ?? null, guestId(request))

export const cartHandlers = [
  route('get', '/cart', 'cart', (ctx) => HttpResponse.json(viewCart(cartFor(ctx))), { auth: 'optional' }),

  route(
    'post',
    '/cart/items',
    'cart',
    async (ctx) => {
      const body = await readJson<AddCartItemRequest>(ctx.request)
      const quantity = Number(body.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) return validationError({ quantity: 'Quantidade inválida.' })
      const nft = body.nftId ? findNft(body.nftId) : undefined
      const edition = nft?.editions.find((e) => e.id === body.editionId)
      if (!nft || !edition) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrados.')
      if (edition.available === 0) return apiError(409, 'AVAILABILITY_CONFLICT', 'Esta edição está esgotada.')

      const cart = cartFor(ctx)
      const line = cart.lines.find((l) => l.nftId === nft.id && l.editionId === edition.id)
      const next = (line?.quantity ?? 0) + quantity
      const limit = Math.min(edition.available, edition.maxPerOrder)
      if (next > limit) {
        return apiError(409, 'AVAILABILITY_CONFLICT', `Limite de ${limit} unidade(s) para esta edição.`, { details: { limit } })
      }
      if (line) {
        line.quantity = next
        line.priceAtAdd = edition.price
      } else {
        cart.lines.push({ id: nextId('line'), nftId: nft.id, editionId: edition.id, quantity, priceAtAdd: edition.price })
      }
      touch(cart)
      return HttpResponse.json(viewCart(cart), { status: 201 })
    },
    { auth: 'optional' },
  ),

  route<{ lineId: string }>(
    'patch',
    '/cart/items/:lineId',
    'cart',
    async (ctx) => {
      const { quantity } = await readJson<{ quantity: number }>(ctx.request)
      const cart = cartFor(ctx)
      const line = cart.lines.find((l) => l.id === ctx.params.lineId)
      if (!line) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')
      if (!Number.isInteger(quantity) || quantity! < 1) return validationError({ quantity: 'Quantidade inválida.' })
      const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
      const limit = Math.min(edition?.available ?? 0, edition?.maxPerOrder ?? 0)
      if (quantity! > limit) {
        return apiError(409, 'AVAILABILITY_CONFLICT', `Limite de ${limit} unidade(s) para esta edição.`, { details: { limit } })
      }
      line.quantity = quantity!
      touch(cart)
      return HttpResponse.json(viewCart(cart))
    },
    { auth: 'optional' },
  ),

  route<{ lineId: string }>(
    'delete',
    '/cart/items/:lineId',
    'cart',
    (ctx) => {
      const cart = cartFor(ctx)
      cart.lines = cart.lines.filter((l) => l.id !== ctx.params.lineId)
      touch(cart)
      return HttpResponse.json(viewCart(cart))
    },
    { auth: 'optional' },
  ),

  /** Accepts current prices for every line (after a price-change notice). */
  route(
    'post',
    '/cart/acknowledge',
    'cart',
    (ctx) => {
      const cart = cartFor(ctx)
      for (const line of cart.lines) {
        const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
        if (edition) line.priceAtAdd = edition.price
      }
      touch(cart)
      return HttpResponse.json(viewCart(cart))
    },
    { auth: 'optional' },
  ),

  route(
    'post',
    '/cart/merge',
    'cart',
    async ({ request, user }) => {
      const { guestCartId } = await readJson<{ guestCartId: string | null }>(request)
      return HttpResponse.json(viewCart(mergeCarts(guestCartId ?? null, user!.id)))
    },
    { auth: 'required' },
  ),

  route(
    'put',
    '/cart/coupon',
    'cart',
    async (ctx) => {
      const { code } = await readJson<{ code: string }>(ctx.request)
      if (!code?.trim()) return validationError({ code: 'Informe um cupom.' })
      const state = couponState(code)
      if (state === 'invalid') return apiError(422, 'COUPON_INVALID', 'Cupom inválido.', { fields: { code: 'Cupom inválido.' } })
      if (state === 'expired') return apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { fields: { code: 'Este cupom expirou.' } })
      const cart = cartFor(ctx)
      cart.couponCode = code.trim().toUpperCase()
      touch(cart)
      return HttpResponse.json(viewCart(cart))
    },
    { auth: 'optional' },
  ),

  route(
    'delete',
    '/cart/coupon',
    'cart',
    (ctx) => {
      const cart = cartFor(ctx)
      cart.couponCode = null
      touch(cart)
      return HttpResponse.json(viewCart(cart))
    },
    { auth: 'optional' },
  ),

  /** Read-only price summary for the cart page (not persisted, cannot be ordered against). */
  route(
    'get',
    '/cart/quote',
    'quote',
    (ctx) => {
      const network = NETWORKS.find((n) => n === ctx.url.searchParams.get('network')) ?? ('ethereum' satisfies Network)
      return HttpResponse.json(buildQuote(cartFor(ctx), network))
    },
    { auth: 'optional' },
  ),
]
