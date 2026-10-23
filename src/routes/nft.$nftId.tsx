import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Heart, Mail, Minus, Plus, Search } from 'lucide-react'
import { toApiError } from '@/api/client'
import type { Nft } from '@/api/types'
import { Breadcrumb, MARKET_TRAIL } from '@/components/shared/Breadcrumb'
import { Price } from '@/components/shared/Price'
import { StarRating } from '@/components/shared/StarRating'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { LinkedinIcon, XIcon } from '@/components/layout/SocialIcons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nftQuery, useNft } from '@/features/catalog/hooks'
import { MobileNftDetail } from '@/features/catalog/MobileNftDetail'
import { NftCarousel } from '@/features/catalog/NftCarousel'
import { EditionPills, usePurchase } from '@/features/catalog/purchase'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { NETWORK_LABEL, shortAddress } from '@/lib/labels'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQuery(params.nftId))
  },
  component: NftDetail,
})

function NftDetail() {
  const { nftId } = Route.useParams()
  const nft = useNft(nftId)
  const isMobile = useIsMobile()

  if (nft.isPending) return <DetailSkeleton />
  if (nft.isError) {
    if (toApiError(nft.error).code === 'NOT_FOUND') {
      return (
        <StateMessage
          className="my-16"
          title="NFT não encontrado"
          description="Este NFT não existe ou foi removido do mercado."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Ver catálogo
              </Link>
            </Button>
          }
        />
      )
    }
    return <QueryError error={nft.error} onRetry={() => void nft.refetch()} title="Não foi possível carregar este NFT." />
  }

  // key: selection state resets when navigating between NFTs
  if (isMobile) return <MobileNftDetail key={nft.data.id} nft={nft.data} extra={<DetailTabs nft={nft.data} />} />

  return (
    <>
      <Breadcrumb items={[...MARKET_TRAIL, { label: nft.data.name }]} />
      <Purchase key={nft.data.id} nft={nft.data} />
      <DetailTabs nft={nft.data} />
      <NftCarousel title="Mais desta coleção" params={{}} excludeIds={[nft.data.id]} />
    </>
  )
}

function Gallery({ nft }: { nft: Nft }) {
  const [image, setImage] = useState(0)
  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
      <ul className="flex gap-3 lg:flex-col" aria-label="Miniaturas">
        {nft.gallery.map((src, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setImage(i)}
              aria-label={`Mostrar imagem ${i + 1} de ${nft.gallery.length}`}
              aria-pressed={i === image}
              className={cn('block overflow-hidden rounded-md border-2 transition-opacity', i === image ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <img src={src} alt="" width={88} height={88} loading="lazy" className="size-16 object-cover sm:size-22" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative flex-1 rounded-md bg-card p-4 sm:p-6">
        <img
          src={nft.gallery[image]}
          alt={`${nft.name}, imagem ${image + 1} de ${nft.gallery.length}`}
          width={600}
          height={600}
          fetchPriority="high"
          className={cn('aspect-square w-full rounded-xl object-cover', nft.soldOut && 'grayscale')}
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="icon-sm" className="absolute top-2 right-2 rounded-full" aria-label="Ampliar imagem">
              <Search />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[min(92vw,720px)] p-3 sm:max-w-[min(92vw,720px)]">
            <DialogTitle className="sr-only">{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
            <img src={nft.gallery[image]} alt={nft.name} width={600} height={600} className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function Purchase({ nft }: { nft: Nft }) {
  const purchase = usePurchase(nft)
  const { edition, qty, maxQuantity, unavailable, limitReached, isFavorite } = purchase

  const shareUrl = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.href)
  const shareText = encodeURIComponent(`${nft.name} na Kurio`)

  return (
    <article aria-labelledby="nft-title" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <Gallery nft={nft} />

      <div className="space-y-5">
        <div className="space-y-2">
          <h1 id="nft-title" className="font-display text-2xl font-bold sm:text-3xl">
            {nft.name}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <Price value={edition.price} compareAt={edition.compareAtPrice} className="text-2xl" />
            <p className="flex items-center gap-2 text-sm">
              <StarRating value={nft.rating.average} />
              {nft.rating.count} avaliações de colecionadores
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold">Sobre este NFT:</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{nft.description}</p>
        </section>

        <EditionPills nft={nft} purchase={purchase} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label="Quantidade" className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              aria-label="Diminuir quantidade"
              disabled={qty <= 1 || unavailable || limitReached}
              onClick={() => purchase.setQuantity(qty - 1)}
            >
              <Minus />
            </Button>
            <output aria-live="polite" className="w-6 text-center text-lg tabular-nums">
              {qty}
            </output>
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              aria-label="Aumentar quantidade"
              disabled={qty >= maxQuantity || unavailable}
              onClick={() => purchase.setQuantity(qty + 1)}
            >
              <Plus />
            </Button>
          </div>
          <div className="flex gap-3">
            <Button size="lg" className="min-w-32 font-bold" disabled={unavailable || limitReached || purchase.adding} onClick={purchase.buy}>
              {purchase.adding ? 'ADICIONANDO…' : 'COMPRAR'}
            </Button>
            {purchase.signedIn ? (
              <Button size="lg" variant="outline" aria-pressed={isFavorite} onClick={purchase.toggleFavorite}>
                <Heart className={cn(isFavorite && 'fill-primary text-primary')} />
                {isFavorite ? 'Favoritado' : 'Favoritar'}
              </Button>
            ) : (
              <Button size="lg" variant="outline" asChild>
                <Link to="." search={(prev) => ({ ...prev, auth: 'entrar' as const })} aria-label="Entre para favoritar">
                  <Heart /> Favoritar
                </Link>
              </Button>
            )}
          </div>
        </div>
        {limitReached && (
          <p role="status" className="text-xs text-primary">
            Você já tem o máximo permitido desta edição no carrinho.
          </p>
        )}

        <dl className="space-y-2 text-sm text-muted-foreground">
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
        <div className="flex items-center gap-3 text-sm font-bold">
          Compartilhar este NFT:
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (abre em nova aba)" className="hover:text-primary">
            <LinkedinIcon className="size-4" aria-hidden />
          </a>
          <a href={`mailto:?subject=${shareText}&body=${shareUrl}`} aria-label="Compartilhar por e-mail" className="hover:text-primary">
            <Mail className="size-4" aria-hidden />
          </a>
          <a href={`https://x.com/intent/post?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no X (abre em nova aba)" className="hover:text-primary">
            <XIcon className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
}

function DetailTabs({ nft }: { nft: Nft }) {
  const network = NETWORK_LABEL[nft.network]
  return (
    <Tabs defaultValue="detalhes" className="mt-16">
      <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
        {[
          { value: 'detalhes', label: 'Detalhes do NFT' },
          { value: 'avaliacoes', label: `Avaliações de colecionadores (${nft.rating.count})` },
        ].map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-sm font-normal shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="detalhes" className="space-y-4 pt-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {nft.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na {network}. A obra
          explora identidade, movimento e luz em um mundo digital sem fronteiras.
        </p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede.{' '}
          {nft.creator.name} recebe {nft.contract.royaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              {shortAddress(nft.contract.address)} · Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>Direitos autorais do criador: {nft.contract.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="avaliacoes" className="pt-4">
        <p className="mb-4 flex items-center gap-2 text-sm">
          <StarRating value={nft.rating.average} /> {nft.rating.average.toLocaleString('pt-BR')} de 5 · {nft.rating.count} avaliações
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {nft.reviews.map((r) => (
            <li key={r.id} className="space-y-2 rounded-md bg-card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <strong>{r.author}</strong>
                <StarRating value={r.rating} />
              </div>
              <p className="text-muted-foreground">{r.text}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</p>
            </li>
          ))}
        </ul>
        {nft.rating.count > nft.reviews.length && (
          <p className="mt-4 text-xs text-muted-foreground">Exibindo as {nft.reviews.length} avaliações mais recentes.</p>
        )}
      </TabsContent>
    </Tabs>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT">
      <div className="shimmer my-4 h-5 w-40 rounded" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
          <div className="flex gap-3 lg:flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer size-16 rounded-md sm:size-22" />
            ))}
          </div>
          <div className="flex-1 rounded-md bg-card p-4 sm:p-6">
            <div className="shimmer aspect-square w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="shimmer h-9 w-3/4 rounded" />
          <div className="shimmer h-8 w-1/3 rounded" />
          <div className="shimmer h-20 w-full rounded" />
          <div className="shimmer h-8 w-64 rounded-full" />
          <div className="shimmer h-10 w-full rounded-md" />
          <div className="shimmer h-16 w-2/3 rounded" />
        </div>
      </div>
    </div>
  )
}
