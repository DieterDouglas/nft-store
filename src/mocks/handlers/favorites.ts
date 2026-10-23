import { HttpResponse } from 'msw'
import { toSummary } from '../commerce'
import { commit, db, findNft } from '../db'
import { apiError, route } from '../http'

const ids = (userId: string) => (db().favorites[userId] ??= [])

export const favoriteHandlers = [
  route(
    'get',
    '/favorites',
    'favorites',
    ({ user }) => {
      const items = ids(user!.id).flatMap((id) => {
        const nft = findNft(id)
        return nft ? [toSummary(nft)] : []
      })
      return HttpResponse.json({ ids: ids(user!.id), items })
    },
    { auth: 'required' },
  ),

  route<{ nftId: string }>(
    'put',
    '/favorites/:nftId',
    'favorites',
    ({ user, params }) => {
      const nft = findNft(params.nftId)
      if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      const list = ids(user!.id)
      // Idempotent: favoriting twice keeps a single entry and a single count.
      if (!list.includes(nft.id)) {
        list.push(nft.id)
        nft.favorites += 1
        commit()
      }
      return HttpResponse.json({ ids: list })
    },
    { auth: 'required' },
  ),

  route<{ nftId: string }>(
    'delete',
    '/favorites/:nftId',
    'favorites',
    ({ user, params }) => {
      const s = db()
      const list = ids(user!.id)
      if (list.includes(params.nftId)) {
        s.favorites[user!.id] = list.filter((id) => id !== params.nftId)
        const nft = findNft(params.nftId)
        if (nft) nft.favorites = Math.max(0, nft.favorites - 1)
        commit()
      }
      return HttpResponse.json({ ids: s.favorites[user!.id] })
    },
    { auth: 'required' },
  ),
]
