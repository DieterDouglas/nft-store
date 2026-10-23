import { useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import type { Nft } from '@/api/types'
import { circleButton, MobileTopBar } from '@/components/mobile/MobileTopBar'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { EditionPills, usePurchase } from './purchase'

/** Swipeable gallery (scroll-snap) with position dots. */
function Gallery({ nft }: { nft: Nft }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label="Galeria"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-[2rem] [scrollbar-width:none]"
      >
        {nft.gallery.map((src, i) => (
          <li key={i} className="w-full shrink-0 snap-center">
            <img
              src={src}
              alt={`${nft.name}, imagem ${i + 1} de ${nft.gallery.length}`}
              width={600}
              height={600}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={cn('aspect-square w-full object-cover', nft.soldOut && 'grayscale')}
            />
          </li>
        ))}
      </ul>
      <div className="absolute inset-x-0 bottom-10 flex justify-center gap-1.5" role="group" aria-label="Imagens">
        {nft.gallery.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Mostrar imagem ${i + 1}`}
            aria-pressed={i === index}
            onClick={() => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' })}
            className={cn('size-2 rounded-full', i === index ? 'bg-primary' : 'bg-background/70')}
          />
        ))}
      </div>
    </div>
  )
}

/** Mobile frame of the NFT detail; `extra` holds the tabs/shelf rendered below the info sheet. */
export function MobileNftDetail({ nft, extra }: { nft: Nft; extra: ReactNode }) {
  const purchase = usePurchase(nft)
  const favorite = purchase.signedIn ? (
    <button
      type="button"
      className={circleButton}
      aria-label={purchase.isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      aria-pressed={purchase.isFavorite}
      onClick={purchase.toggleFavorite}
    >
      <Heart className={cn('size-5', purchase.isFavorite && 'fill-primary')} />
    </button>
  ) : (
    <Link to="." search={(prev) => ({ ...prev, auth: 'entrar' as const })} className={circleButton} aria-label={`Entre para favoritar ${nft.name}`}>
      <Heart className="size-5" />
    </Link>
  )

  return (
    <div className="pb-48">
      <MobileTopBar action={favorite} className="pt-4" />
      <Gallery nft={nft} />

      <article aria-labelledby="nft-title-m" className="relative -mx-4 -mt-8 space-y-5 rounded-t-[2rem] bg-card px-6 pt-7 pb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 id="nft-title-m" className="font-display text-2xl font-bold">
            {nft.name}
          </h1>
          <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-3 py-1 text-sm">
            <Star aria-hidden className="size-4 fill-primary text-primary" />
            <span className="sr-only">Avaliação </span>
            {nft.rating.average.toLocaleString('pt-BR')}
            <span className="text-muted-foreground">
              ({nft.rating.count}
              <span className="sr-only"> avaliações</span>)
            </span>
          </p>
        </div>
        <p className="leading-relaxed text-muted-foreground">{nft.description}</p>
        <EditionPills nft={nft} purchase={purchase} size="lg" />
        <dl className="space-y-3 text-muted-foreground">
          <div className="flex gap-1">
            <dt>ID do token:</dt>
            <dd>{nft.tokenId}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Coleção:</dt>
            <dd>{nft.collection}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Atributos:</dt>
            <dd>{nft.traits.join(', ')}</dd>
          </div>
        </dl>
        {extra}
      </article>

      {/* Fixed purchase bar from the mobile frame. */}
      <section aria-label="Comprar" className="fixed inset-x-0 bottom-0 z-30 rounded-t-[2rem] bg-card px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.35)]">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-sm font-bold">
                Qtd.
              </span>
              <QuantityStepper
                label="Quantidade"
                value={purchase.qty}
                max={Math.max(1, purchase.maxQuantity)}
                disabled={purchase.unavailable || purchase.limitReached}
                onChange={purchase.setQuantity}
              />
            </div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              <span className="sr-only">Total: </span>
              {formatEth(purchase.total)}
            </p>
          </div>
          {purchase.limitReached && (
            <p role="status" className="text-xs text-primary">
              Você já tem o máximo permitido desta edição no carrinho.
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={purchase.unavailable || purchase.limitReached || purchase.adding}
              onClick={purchase.buy}
              className="h-14 flex-1 rounded-full bg-linear-to-r from-primary to-[#b8733d] font-bold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {purchase.unavailable ? 'Edição esgotada' : purchase.adding ? 'Adicionando…' : 'Comprar NFT'}
            </button>
            <button
              type="button"
              aria-label="Adicionar ao carrinho"
              disabled={purchase.unavailable || purchase.limitReached || purchase.adding}
              onClick={purchase.addToCart}
              className="grid size-14 place-items-center rounded-full border border-border bg-muted text-primary disabled:opacity-50"
            >
              <ShoppingCart className="size-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
