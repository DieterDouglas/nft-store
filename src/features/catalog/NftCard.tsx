import { Link } from '@tanstack/react-router'
import { Eye, Heart, ShoppingCart } from 'lucide-react'
import type { NftSummary } from '@/api/types'
import { Price } from '@/components/shared/Price'
import { Button } from '@/components/ui/button'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { useQuickAdd } from './use-quick-add'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const session = useSession()
  const quickAdd = useQuickAdd()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false

  return (
    <article className="group relative" aria-labelledby={`nft-${nft.id}-name`}>
      <div className="relative rounded-md bg-card p-2 max-md:rounded-3xl">
        {nft.rarity && (
          <span className="absolute top-3 left-0 z-10 bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground uppercase">{nft.rarity}</span>
        )}
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block overflow-hidden rounded-xl max-md:rounded-2xl" tabIndex={-1} aria-hidden>
          <img
            src={nft.image}
            alt=""
            width={600}
            height={600}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={cn('aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]', nft.soldOut && 'opacity-50 grayscale')}
          />
        </Link>
        <MobileHeart nft={nft} isFavorite={isFavorite} onToggle={() => toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite, name: nft.name })} signedIn={Boolean(session)} />
        {nft.soldOut && (
          <span className="absolute top-14 right-3 md:top-3 rounded bg-background/90 px-2 py-0.5 text-xs font-bold uppercase">Esgotado</span>
        )}
        {/* Quick actions: always reachable by keyboard, revealed on hover/focus for pointer users. */}
        <div className="absolute right-4 bottom-4 hidden gap-1.5 transition-opacity md:flex md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            disabled={nft.soldOut || quickAdd.isPending}
            onClick={() => void quickAdd.add(nft)}
          >
            <ShoppingCart />
          </Button>
          {session && (
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite, name: nft.name })}
            >
              <Heart className={cn(isFavorite && 'fill-primary text-primary')} />
            </Button>
          )}
          <Button size="icon-sm" variant="secondary" asChild>
            <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Ver detalhes de ${nft.name}`}>
              <Eye />
            </Link>
          </Button>
        </div>
      </div>
      <h3 id={`nft-${nft.id}-name`} className="mt-3 text-sm">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="hover:text-primary">
          {nft.name}
        </Link>
      </h3>
      <Price value={nft.price} compareAt={nft.compareAtPrice} className="text-sm" />
    </article>
  )
}

/** Phones: heart always visible on the artwork (no hover on touch). Guests are sent to login. */
function MobileHeart({ nft, isFavorite, onToggle, signedIn }: { nft: NftSummary; isFavorite: boolean; onToggle: () => void; signedIn: boolean }) {
  const cls = 'absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-background/80 text-primary md:hidden'
  if (!signedIn) {
    return (
      <Link to="." search={(prev) => ({ ...prev, auth: 'entrar' as const })} aria-label={`Entre para favoritar ${nft.name}`} className={cls}>
        <Heart className="size-5" />
      </Link>
    )
  }
  return (
    <button
      type="button"
      aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      aria-pressed={isFavorite}
      onClick={onToggle}
      className={cls}
    >
      <Heart className={cn('size-5', isFavorite && 'fill-primary')} />
    </button>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="rounded-md bg-card p-2 max-md:rounded-3xl">
        <div className="shimmer aspect-square w-full rounded-xl max-md:rounded-2xl" />
      </div>
      <div className="shimmer mt-3 h-4 w-2/3 rounded" />
      <div className="shimmer mt-2 h-4 w-1/3 rounded" />
    </div>
  )
}
