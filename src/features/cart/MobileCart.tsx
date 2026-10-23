import { Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { CartLine } from '@/api/types'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { ISSUE_LABEL } from '@/lib/labels'
import { formatEth, mul } from '@/lib/money'
import { CouponForm } from './CouponForm'
import { useAcknowledgePrices, useCart, useCartQuote, useRemoveCartLine, useUpdateCartLine } from './hooks'
import { OrderSummarySkeleton, SummaryRows } from './OrderSummary'

const pillButton = 'h-14 w-full rounded-full bg-linear-to-r from-primary to-[#b8733d] text-base font-bold'

function MobileCartRow({ line }: { line: CartLine }) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const max = Math.max(1, Math.min(line.available, line.maxPerOrder))
  const busy = update.isPending || remove.isPending

  return (
    <li className="overflow-hidden rounded-3xl bg-card">
      <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[112px_1fr]">
        <img src={line.image} alt="" width={112} height={112} loading="lazy" className="aspect-square h-full w-full object-cover" />
        <div className="relative min-w-0 space-y-1 py-3 pr-3 pl-4">
          <h3 className="truncate pr-8 font-bold">
            <Link to="/nft/$nftId" params={{ nftId: line.nftId }}>
              {line.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">Edição: {line.editionShortLabel}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-lg font-bold text-primary tabular-nums">
              <span className="sr-only">Total do item: </span>
              {formatEth(mul(line.unitPrice, line.quantity))}
            </p>
            <QuantityStepper
              variant="soft"
              label={`Quantidade de ${line.name}`}
              value={line.quantity}
              max={line.issues.includes('insufficient') ? line.quantity : max}
              disabled={busy || line.available === 0}
              onChange={(quantity) => update.mutate({ lineId: line.id, quantity: Math.min(quantity, max) })}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => remove.mutate({ lineId: line.id, name: line.name })}
            aria-label={`Remover ${line.name} do carrinho`}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-primary hover:bg-muted"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
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

/** Mobile frame "Carrinho de NFTs": item cards + rounded summary sheet. */
export function MobileCart() {
  const cart = useCart()
  const session = useSession()
  const items = cart.data?.items ?? []
  const quote = useCartQuote('ethereum', items.length > 0)
  const acknowledge = useAcknowledgePrices()
  const priceChanged = items.some((i) => i.issues.includes('price-changed'))
  const blocking = items.some((i) => i.issues.includes('sold-out') || i.issues.includes('insufficient'))

  return (
    <div className="pb-6">
      <MobileTopBar title="Carrinho de NFTs" />
      <h1 className="sr-only">Carrinho</h1>

      {cart.isPending ? (
        <div className="space-y-4" aria-busy="true" aria-label="Carregando carrinho">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-28 rounded-3xl" />
          ))}
        </div>
      ) : cart.isError ? (
        <QueryError error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho." />
      ) : !items.length ? (
        <StateMessage
          className="mt-6 rounded-3xl"
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
        <>
          {(priceChanged || blocking) && (
            <div role="status" className="mb-4 space-y-3 rounded-3xl border border-primary/60 bg-secondary p-4 text-sm">
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
          <ul className="space-y-4" aria-label="Itens do carrinho">
            {items.map((line) => (
              <MobileCartRow key={line.id} line={line} />
            ))}
          </ul>

          <section aria-labelledby="resumo-m" className="-mx-4 mt-6 space-y-5 rounded-t-[2rem] bg-card px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <h2 id="resumo-m" className="sr-only">
              Resumo da carteira
            </h2>
            <CouponForm applied={cart.data.couponCode} variant="pill" />
            {quote.isPending ? (
              <OrderSummarySkeleton />
            ) : quote.isError ? (
              <QueryError error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular os valores." />
            ) : (
              <SummaryRows quote={quote.data} estimated stale={quote.isFetching} />
            )}
            {blocking ? (
              <Button className={pillButton} disabled>
                Revise o carrinho para continuar
              </Button>
            ) : (
              <Button asChild className={pillButton}>
                <Link to="/checkout">{session ? 'Conectar e finalizar' : 'Entrar e finalizar'}</Link>
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  )
}
