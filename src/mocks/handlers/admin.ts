import { HttpResponse } from 'msw'
import { updateEdition } from '../commerce'
import { commit, db, resetDb } from '../db'
import { apiError, readJson, route } from '../http'
import { dropConnections, replayEvents } from '../realtime'
import { getScenario, isScenario, SCENARIOS, setScenario } from '../scenarios'

/**
 * Mock-server control plane ("backend admin"). Used by the in-app mock panel and by
 * Playwright. Changes flow to the UI only through REST responses and Socket.IO events.
 */
export const adminHandlers = [
  route('get', '/__mock/scenario', 'admin', () => HttpResponse.json({ active: getScenario(), scenarios: SCENARIOS }), { raw: true }),

  route(
    'put',
    '/__mock/scenario',
    'admin',
    async ({ request }) => {
      const { id } = await readJson<{ id: string }>(request)
      if (!isScenario(id)) return apiError(422, 'VALIDATION_ERROR', 'Cenário desconhecido.')
      setScenario(id)
      return HttpResponse.json({ active: id })
    },
    { raw: true },
  ),

  route(
    'post',
    '/__mock/reset',
    'admin',
    async () => {
      await resetDb()
      setScenario('default')
      return new HttpResponse(null, { status: 204 })
    },
    { raw: true },
  ),

  /** Expires every active session (or one user's) to exercise expiry mid-navigation/checkout. */
  route(
    'post',
    '/__mock/expire-sessions',
    'admin',
    async ({ request }) => {
      const { userId } = await readJson<{ userId?: string }>(request)
      const past = new Date(Date.now() - 1000).toISOString()
      db().sessions.forEach((s) => (!userId || s.userId === userId) && (s.expiresAt = past))
      commit()
      return new HttpResponse(null, { status: 204 })
    },
    { raw: true },
  ),

  /** Changes price/availability like a seller or another buyer would; broadcasts nft.updated. */
  route<{ id: string }>(
    'patch',
    '/__mock/nfts/:id',
    'admin',
    async ({ request, params }) => {
      const body = await readJson<{ editionId?: string; price?: string; available?: number }>(request)
      const patch: { price?: string; available?: number } = {}
      if (body.price !== undefined) patch.price = body.price
      if (body.available !== undefined) patch.available = body.available
      const nft = updateEdition(params.id, body.editionId, patch)
      if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      return HttpResponse.json(nft)
    },
    { raw: true },
  ),

  /** Bumps the first line of a cart (helper for the panel's "change cart item" button). */
  route(
    'post',
    '/__mock/cart-item-change',
    'admin',
    async ({ request }) => {
      const { kind } = await readJson<{ kind: 'price' | 'sold-out' }>(request)
      const line = Object.values(db().carts).find((c) => c.lines.length)?.lines[0]
      if (!line) return apiError(404, 'NOT_FOUND', 'Nenhum carrinho com itens.')
      const nft = db().nfts.find((n) => n.id === line.nftId)!
      const edition = nft.editions.find((e) => e.id === line.editionId)!
      updateEdition(nft.id, edition.id, kind === 'price' ? { price: (Number(edition.price) + 0.1).toFixed(2) } : { available: 0 })
      return HttpResponse.json({ nftId: nft.id })
    },
    { raw: true },
  ),

  route(
    'post',
    '/__mock/socket/drop',
    'admin',
    async ({ request }) => {
      const { offlineMs } = await readJson<{ offlineMs?: number }>(request)
      dropConnections(offlineMs ?? 3000)
      return new HttpResponse(null, { status: 204 })
    },
    { raw: true },
  ),

  route(
    'post',
    '/__mock/events/replay',
    'admin',
    async ({ request }) => {
      const { count } = await readJson<{ count?: number }>(request)
      return HttpResponse.json({ replayed: replayEvents(count ?? 5) })
    },
    { raw: true },
  ),
]
