import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { CartLine } from '@/api/types'
import { Breadcrumb, MARKET_TRAIL } from '@/components/shared/Breadcrumb'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { NftCarousel } from '@/features/catalog/NftCarousel'
import {
  useAcknowledgePrices,
  useCart,
  useCartQuote,
  useRemoveCartLine,
  useUpdateCartLine,
} from '@/features/cart/hooks'
import { CouponForm } from '@/features/cart/CouponForm'
import { MobileCart } from '@/features/cart/MobileCart'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { OrderSummary, OrderSummarySkeleton } from '@/features/cart/OrderSummary'
import { useSession } from '@/hooks/use-session'
import { ISSUE_LABEL } from '@/lib/labels'
import { formatEth, mul } from '@/lib/money'

export const Route = createFileRoute('/carrinho')({
  component: CartRoute,
})

const COLS = 'sm:grid-cols-[minmax(0,2.4fr)_1fr_1fr_1fr_40px]'

function CartRow({ line }: { line: CartLine }) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const max = Math.max(1, Math.min(line.available, line.maxPerOrder))
  const busy = update.isPending || remove.isPending
  const priceChanged = line.issues.includes('price-changed')

  return (
    <li className="rounded-md bg-card">
      <div className={`grid grid-cols-[64px_1fr_auto] items-center gap-x-4 gap-y-3 p-2 pr-4 ${COLS}`}>
        <div className="col-span-2 flex min-w-0 items-center gap-4 sm:col-span-1">
          <img src={line.image} alt="" width={80} height={80} loading="lazy" className="size-16 shrink-0 rounded object-cover sm:size-20" />
          <div className="min-w-0">
            <h3 className="truncate font-bold">
              <Link to="/nft/$nftId" params={{ nftId: line.nftId }} className="hover:text-primary">
                {line.name}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">ID do token: {line.tokenId}</p>
            <p className="text-xs text-muted-foreground">{line.editionLabel}</p>
          </div>
        </div>
        <p className="row-start-2 font-bold whitespace-nowrap tabular-nums sm:row-start-auto">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(line.unitPrice)}
          {priceChanged && (
            <s className="ml-2 block text-xs font-normal text-muted-foreground">
              <span className="sr-only">antes </span>
              {formatEth(line.priceAtAdd)}
            </s>
          )}
        </p>
        <QuantityStepper
          className="row-start-2 justify-self-center sm:row-start-auto sm:justify-self-start"
          label={`Quantidade de ${line.name}`}
          value={line.quantity}
          max={line.issues.includes('insufficient') ? line.quantity : max}
          disabled={busy || line.available === 0}
          onChange={(quantity) => update.mutate({ lineId: line.id, quantity: Math.min(quantity, max) })}
        />
        <p className="row-start-2 justify-self-end font-bold text-primary tabular-nums sm:row-start-auto sm:justify-self-start">
          <span className="sr-only">Total do item: </span>
          {formatEth(mul(line.unitPrice, line.quantity))}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="col-start-3 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto"
          disabled={busy}
          onClick={() => remove.mutate({ lineId: line.id, name: line.name })}
          aria-label={`Remover ${line.name} do carrinho`}
        >
          <Trash2 className="size-5" />
        </Button>
      </div>
      {line.issues.length > 0 && (
        <ul className="space-y-1 border-t border-border px-4 py-2">
          {line.issues.map((issue) => (
            <li key={issue} className="flex items-start gap-1.5 text-xs text-primary">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {ISSUE_LABEL[issue]}
              {issue === 'insufficient' && ` Disponível: ${line.available}.`}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function CartRoute() {
  return useIsMobile() ? <MobileCart /> : <CartPage />
}

function CartPage() {
  const cart = useCart()
  const session = useSession()
  const hasItems = Boolean(cart.data?.items.length)
  const quote = useCartQuote('ethereum', hasItems)
  const acknowledge = useAcknowledgePrices()
  const crumbs = [...MARKET_TRAIL, { label: 'Carrinho' }]

  if (cart.isPending) {
    return (
      <>
        <Breadcrumb items={crumbs} />
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Carregando carrinho">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-24 rounded-md" />
            ))}
          </div>
          <OrderSummarySkeleton />
        </div>
      </>
    )
  }
  if (cart.isError) return <QueryError error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho." />

  const items = cart.data.items
  const priceChanged = items.some((i) => i.issues.includes('price-changed'))
  const blocking = items.some((i) => i.issues.includes('sold-out') || i.issues.includes('insufficient'))

  return (
    <>
      <Breadcrumb items={crumbs} />
      <h1 className="sr-only">Carrinho</h1>
      {!items.length ? (
        <StateMessage
          className="my-10"
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione NFTs para continuar."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div className="space-y-4">
            <div aria-hidden className={`hidden border-b border-border pb-3 font-bold sm:grid ${COLS} gap-x-4`}>
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            {(priceChanged || blocking) && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/60 bg-secondary p-4 text-sm">
                <p className="flex items-start gap-2">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  {blocking
                    ? 'Alguns itens ficaram indisponíveis. Ajuste as quantidades ou remova-os para continuar.'
                    : 'Preços foram atualizados enquanto você navegava. O resumo já reflete os novos valores.'}
                </p>
                {priceChanged && !blocking && (
                  <Button size="sm" variant="outline" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
                    Entendi
                  </Button>
                )}
              </div>
            )}
            <ul className="space-y-3" aria-label="Itens do carrinho">
              {items.map((line) => (
                <CartRow key={line.id} line={line} />
              ))}
            </ul>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            {quote.isPending ? (
              <OrderSummarySkeleton />
            ) : quote.isError ? (
              <QueryError error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular os valores." />
            ) : (
              <OrderSummary title="Resumo da carteira" quote={quote.data} stale={quote.isFetching} estimated intro={<CouponForm applied={cart.data.couponCode} />}>
                {blocking ? (
                  <Button size="lg" className="h-12 w-full font-bold" disabled>
                    Revise o carrinho para continuar
                  </Button>
                ) : (
                  <Button asChild size="lg" className="h-12 w-full font-bold">
                    <Link to="/checkout">{session ? 'Conectar e finalizar' : 'Entrar e finalizar'}</Link>
                  </Button>
                )}
                <p className="text-center">
                  <Link to="/" hash="catalogo" className="text-sm text-primary hover:underline">
                    Continuar explorando
                  </Link>
                </p>
              </OrderSummary>
            )}
          </div>
        </div>
      )}
      <NftCarousel title="Colecionadores também viram" params={{ tab: 'trending' }} excludeIds={items.map((i) => i.nftId)} />
    </>
  )
}
