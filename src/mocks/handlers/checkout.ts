import { delay, HttpResponse } from 'msw'
import { NETWORKS, type CreateOrderRequest, type Network, type Order } from '@/api/types'
import { buildQuote, getOrCreateCart, settleDueOrders, updateEdition } from '../commerce'
import { commit, db, findNft, nextId, stableHash, type MockOrder } from '../db'
import { apiError, readJson, route, validationError } from '../http'
import { getScenario } from '../scenarios'

const SETTLE_AFTER_MS = 3000
/** Longer than the client's order timeout (ORDER_TIMEOUT_MS in api/client.ts). */
const SLOW_FIRST_RESPONSE_MS = 9000

const triggeredFor = new Set<string>()

export const checkoutHandlers = [
  /** Persisted quote for the review step. Orders must reference it and its fingerprint. */
  route(
    'post',
    '/checkout/quote',
    'quote',
    async ({ request, user }) => {
      const { network } = await readJson<{ network: Network }>(request)
      const net = NETWORKS.find((n) => n === network) ?? 'ethereum'
      const cart = getOrCreateCart(user!.id, null)
      if (!cart.lines.length) return apiError(409, 'VALIDATION_ERROR', 'Seu carrinho está vazio.')
      const quote = buildQuote(cart, net)
      db().quotes[quote.id] = { quote, cartId: cart.id, userId: user!.id }
      commit()

      // Scenario: the market moves while the buyer is reviewing.
      const scenario = getScenario()
      const first = cart.lines[0]
      if ((scenario === 'price-change' || scenario === 'sold-out') && !triggeredFor.has(cart.id)) {
        triggeredFor.add(cart.id)
        setTimeout(() => {
          const edition = findNft(first.nftId)?.editions.find((e) => e.id === first.editionId)
          if (!edition) return
          if (scenario === 'price-change') updateEdition(first.nftId, first.editionId, { price: (Number(edition.price) + 0.15).toFixed(2) })
          else updateEdition(first.nftId, first.editionId, { available: 0 })
        }, 1500)
      }
      return HttpResponse.json(quote)
    },
    { auth: 'required' },
  ),

  route(
    'post',
    '/orders',
    'orders',
    async ({ request, user }) => {
      const key = request.headers.get('idempotency-key')
      if (!key) return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key é obrigatório.')
      const body = await readJson<CreateOrderRequest>(request)
      const s = db()
      const requestHash = stableHash(body)

      const previous = s.idempotency[key]
      if (previous) {
        if (previous.userId !== user!.id || previous.requestHash !== requestHash) {
          return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
        }
        // Same attempt replayed (double click, retry after timeout): same order, no new purchase.
        return HttpResponse.json(s.orders[previous.orderId].order, { status: 200 })
      }

      const fields: Record<string, string> = {}
      const b = body.buyer
      if (!b?.displayName || b.displayName.trim().length < 2) fields.displayName = 'Informe o nome de exibição.'
      if (!b?.username || !/^[a-z0-9._]{3,30}$/i.test(b.username.trim())) fields.username = 'Nome de usuário inválido.'
      if (!b?.profileName || b.profileName.trim().length < 2) fields.profileName = 'Informe o nome do perfil.'
      if (!b?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim())) fields.email = 'Informe um e-mail válido.'
      if (b?.ensName && !/^[a-z0-9-]{3,63}$/.test(b.ensName.trim().toLowerCase())) fields.ensName = 'Nome ENS inválido.'
      if (b?.referralCode && !/^[A-Z0-9]{4,12}$/i.test(b.referralCode.trim())) fields.referralCode = 'Código de indicação inválido.'
      if ((b?.note ?? '').length > 500) fields.note = 'A observação pode ter até 500 caracteres.'
      if (Object.keys(fields).length) return validationError(fields)

      const wallet = (s.wallets[user!.id] ?? []).find((w) => w.id === body.walletId)
      if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', { fields: { walletId: 'Selecione uma carteira.' } })

      const stored = body.quoteId ? s.quotes[body.quoteId] : undefined
      if (!stored || stored.userId !== user!.id) return apiError(409, 'QUOTE_STALE', 'Cotação inválida. Revise o pedido.')

      const cart = getOrCreateCart(user!.id, null)
      const fresh = buildQuote(cart, stored.quote.network)
      if (fresh.issues.length) {
        return apiError(409, 'AVAILABILITY_CONFLICT', 'Algum item ficou indisponível. Revise o carrinho.', { details: { quote: fresh } })
      }
      if (fresh.fingerprint !== body.fingerprint || Date.parse(stored.quote.expiresAt) < Date.now()) {
        s.quotes[fresh.id] = { quote: fresh, cartId: cart.id, userId: user!.id }
        commit()
        return apiError(409, 'QUOTE_STALE', 'Preço, disponibilidade ou taxas mudaram. Confirme os novos valores.', { details: { quote: fresh } })
      }

      const now = new Date().toISOString()
      const order: Order = {
        id: nextId('ord'),
        status: 'pending',
        version: 1,
        createdAt: now,
        updatedAt: now,
        receipt: {
          lines: stored.quote.lines,
          coupon: stored.quote.coupon,
          subtotal: stored.quote.subtotal,
          discount: stored.quote.discount,
          networkFee: stored.quote.networkFee,
          total: stored.quote.total,
          network: body.network ?? stored.quote.network,
          wallet: { label: wallet.label, address: wallet.address, provider: wallet.provider },
          buyer: {
            displayName: b!.displayName.trim(),
            username: b!.username.trim().toLowerCase(),
            profileName: b!.profileName.trim(),
            email: b!.email.trim().toLowerCase(),
            ensName: b!.ensName?.trim().toLowerCase() || null,
            referralCode: b!.referralCode?.trim().toUpperCase() || null,
            note: b!.note?.trim() || null,
          },
        },
        transaction: null,
        declineReason: null,
      }
      const record: MockOrder = {
        order,
        userId: user!.id,
        cartId: cart.id,
        requestHash,
        settleAt: Date.now() + SETTLE_AFTER_MS,
        outcome: getScenario() === 'payment-declined' ? 'declined' : 'confirmed',
      }
      s.orders[order.id] = record
      s.idempotency[key] = { userId: user!.id, requestHash, orderId: order.id }
      commit()

      // Reserve units while the payment settles (broadcasts nft.updated).
      for (const line of order.receipt.lines) {
        const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
        if (edition) updateEdition(line.nftId, line.editionId, { available: edition.available - line.quantity })
      }

      // Scenario: order exists server-side, but the first response is lost to a client timeout.
      if (getScenario() === 'order-timeout') await delay(SLOW_FIRST_RESPONSE_MS)
      return HttpResponse.json(order, { status: 201 })
    },
    { auth: 'required' },
  ),

  route<{ id: string }>(
    'get',
    '/orders/:id',
    'orders',
    ({ user, params }) => {
      settleDueOrders()
      const record = db().orders[params.id]
      if (!record) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      if (record.userId !== user!.id) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
      return HttpResponse.json(record.order)
    },
    { auth: 'required' },
  ),
]
