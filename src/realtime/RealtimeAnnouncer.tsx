import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from '@/api/endpoints'
import type { Cart } from '@/api/types'
import { useUserId } from '@/hooks/use-session'
import { formatEth } from '@/lib/money'
import { notices } from './realtime'

/** Turns realtime events into accessible announcements (Sonner toasts are aria-live). */
export function RealtimeAnnouncer() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  useEffect(
    () =>
      notices.subscribe((notice) => {
        if (notice.kind === 'nft-changed') {
          // Only items the visitor holds are worth interrupting for.
          const cart = queryClient.getQueryData<Cart>(qk.cart(userId))
          const line = cart?.items.find((i) => i.nftId === notice.event.resource.id)
          if (!line) return
          const edition = notice.event.data.editions.find((e) => e.id === line.editionId)
          if (!edition) return
          if (edition.available === 0) toast.warning(`${notice.name} (${line.editionLabel}) esgotou. Revise seu carrinho.`)
          else if (edition.price !== line.unitPrice) toast.info(`${notice.name}: preço atualizado para ${formatEth(edition.price)}.`)
          else if (edition.available < line.quantity) toast.warning(`${notice.name}: restam apenas ${edition.available} unidade(s).`)
        } else if (notice.order.status === 'confirmed') {
          toast.success(`Pedido ${notice.order.id} confirmado!`)
        } else if (notice.order.status === 'declined') {
          toast.error(`Pedido ${notice.order.id} foi recusado.`)
        }
      }),
    [queryClient, userId],
  )
  return null
}
