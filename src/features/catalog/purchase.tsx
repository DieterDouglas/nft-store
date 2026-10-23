import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Nft } from '@/api/types'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { useSession } from '@/hooks/use-session'
import { mul } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Purchase state shared by the desktop and mobile detail layouts: edition, quantity
 * (capped by stock, per-order limit and what is already in the cart) and favorite.
 */
export function usePurchase(nft: Nft) {
  const cart = useCart()
  const session = useSession()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const navigate = useNavigate()

  const [editionId, setEditionId] = useState(
    () => nft.editions.find((e) => e.id === 'aberta' && e.available > 0)?.id ?? nft.editions.find((e) => e.available > 0)?.id,
  )
  const [quantity, setQuantity] = useState(1)
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[nft.editions.length - 1]
  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const maxQuantity = Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart)
  const unavailable = edition.available === 0
  const limitReached = !unavailable && maxQuantity === 0
  // Realtime/stock changes can lower the ceiling below the chosen quantity: clamp on read.
  const qty = Math.max(1, Math.min(quantity, maxQuantity || 1))
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false

  const add = (then: 'cart' | 'stay') =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: qty, name: `${nft.name} (${edition.shortLabel})` },
      { onSuccess: () => (then === 'cart' ? void navigate({ to: '/carrinho' }) : setQuantity(1)) },
    )

  return {
    edition,
    selectEdition: (id: string) => {
      setEditionId(id)
      setQuantity(1)
    },
    qty,
    setQuantity,
    maxQuantity,
    inCart,
    unavailable,
    limitReached,
    total: mul(edition.price, qty),
    signedIn: Boolean(session),
    isFavorite,
    toggleFavorite: () => toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite, name: nft.name }),
    adding: addToCart.isPending,
    /** "COMPRAR"/"Comprar NFT": add and open the cart. */
    buy: () => add('cart'),
    /** Cart icon (mobile): add and stay on the page. */
    addToCart: () => add('stay'),
  }
}

export type Purchase = ReturnType<typeof usePurchase>

/** Edition pills (1/1 · 1/10 · 1/50 · ABERTA) as a native radio group: arrow keys work. */
export function EditionPills({ nft, purchase, size = 'sm' }: { nft: Nft; purchase: Purchase; size?: 'sm' | 'lg' }) {
  return (
    <fieldset className="space-y-2">
      <legend className={cn('mb-2 font-bold', size === 'sm' ? 'text-sm' : 'text-base')}>Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {nft.editions.map((e) => {
          const soldOut = e.available === 0
          return (
            <label key={e.id} className={cn('relative', soldOut ? 'cursor-not-allowed' : 'cursor-pointer')}>
              <input
                type="radio"
                name={`edition-${nft.id}`}
                value={e.id}
                checked={e.id === purchase.edition.id}
                disabled={soldOut}
                onChange={() => purchase.selectEdition(e.id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'block rounded-full border border-border transition-colors peer-checked:border-primary peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                  size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
                  soldOut ? 'text-muted-foreground line-through opacity-60' : 'hover:border-primary/70',
                )}
              >
                {e.shortLabel}
                <span className="sr-only">
                  {' '}
                  — {e.label}
                  {soldOut ? ', esgotada' : ''}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {purchase.edition.label} ·{' '}
        {purchase.unavailable
          ? 'esgotada'
          : `${purchase.edition.available} de ${purchase.edition.supply} disponíveis · até ${purchase.edition.maxPerOrder} por pedido`}
        {purchase.inCart > 0 && ` · ${purchase.inCart} no seu carrinho`}
      </p>
    </fieldset>
  )
}
