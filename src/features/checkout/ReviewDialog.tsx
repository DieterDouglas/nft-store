import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toApiError } from '@/api/client'
import { api } from '@/api/endpoints'
import type { Buyer, Network, Quote, Wallet } from '@/api/types'
import { QueryError } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderSummarySkeleton, SummaryRows } from '@/features/cart/OrderSummary'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/lib/labels'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { notices } from '@/realtime/realtime'
import { usePlaceOrder } from './use-place-order'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  buyer: Buyer
  wallet: Wallet
  network: Network
}

/**
 * Review step before sending the order: a fresh server quote, invalidated by realtime
 * price/stock events, and the idempotent order submission.
 */
export function ReviewDialog({ open, onOpenChange, buyer, wallet, network }: Props) {
  const navigate = useNavigate()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [previousTotal, setPreviousTotal] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const createQuote = useMutation({
    mutationFn: () => api.checkout.quote(network),
    onSuccess: (q) => {
      setQuote(q)
      setStale(false)
    },
  })
  const placeOrder = usePlaceOrder({ onPlaced: (order) => void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true }) })

  // Mounted per opening (see checkout page), so each review starts from a fresh quote.
  useEffect(() => {
    createQuote.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A price/stock event for anything in this quote blocks confirmation until refreshed.
  useEffect(
    () =>
      notices.subscribe((n) => {
        if (n.kind === 'nft-changed' && quote?.lines.some((l) => l.nftId === n.event.resource.id)) {
          setPreviousTotal(quote.total)
          setStale(true)
        }
      }),
    [quote],
  )

  const confirm = () => {
    if (!quote || stale) return
    placeOrder.place(
      { quoteId: quote.id, fingerprint: quote.fingerprint, walletId: wallet.id, network, buyer },
      {
        onError: (error) => {
          const apiError = toApiError(error)
          const fresh = (apiError.details as { quote?: Quote } | undefined)?.quote
          if ((apiError.code === 'QUOTE_STALE' || apiError.code === 'AVAILABILITY_CONFLICT') && fresh) {
            setPreviousTotal(quote.total)
            setQuote(fresh)
            setStale(apiError.code === 'AVAILABILITY_CONFLICT')
          }
        },
      },
    )
  }

  const orderError = placeOrder.error ? toApiError(placeOrder.error) : null
  const blockingIssues = Boolean(quote?.issues.length)

  return (
    <Dialog open={open} onOpenChange={(next) => !placeOrder.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise sua compra</DialogTitle>
          <DialogDescription>
            {wallet.label} ({PROVIDER_LABEL[wallet.provider]} · {shortAddress(wallet.address)}) na rede {NETWORK_LABEL[network]}.
          </DialogDescription>
        </DialogHeader>

        {stale && (
          <div role="alert" className="space-y-3 rounded-md border border-primary bg-secondary p-3 text-sm">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Preço ou disponibilidade de um item mudou durante a revisão. Atualize os valores antes de confirmar.
            </p>
            <Button size="sm" disabled={createQuote.isPending} onClick={() => createQuote.mutate()}>
              Atualizar valores
            </Button>
          </div>
        )}
        {previousTotal && !stale && quote && previousTotal !== quote.total && (
          <p role="status" className="rounded-md border border-primary/60 p-3 text-sm">
            Os valores foram atualizados: total anterior <s>{formatEth(previousTotal)}</s>, novo total <strong className="text-primary">{formatEth(quote.total)}</strong>. Confirme
            novamente para concluir.
          </p>
        )}

        {createQuote.isError && !quote ? (
          <QueryError error={createQuote.error} onRetry={() => createQuote.mutate()} title="Não foi possível calcular a cotação." />
        ) : !quote ? (
          <OrderSummarySkeleton />
        ) : (
          <div className={cn('space-y-4', stale && 'opacity-60')}>
            <ul className="space-y-3">
              {quote.lines.map((l) => (
                <li key={`${l.nftId}-${l.editionId}`} className="flex items-center gap-3 text-sm">
                  <img src={l.image} alt="" width={48} height={48} className="size-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.editionLabel} · {l.quantity} × {formatEth(l.unitPrice)}
                    </p>
                  </div>
                  <p className="font-bold text-primary tabular-nums">{formatEth(l.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-4">
              <SummaryRows quote={quote} />
            </div>
          </div>
        )}

        {blockingIssues && (
          <p role="alert" className="text-sm text-destructive">
            Há itens indisponíveis.{' '}
            <Link to="/carrinho" className="underline">
              Revise o carrinho
            </Link>
            .
          </p>
        )}
        {orderError && orderError.code !== 'QUOTE_STALE' && (
          <p role="alert" className="text-sm text-destructive">
            {orderError.message}
            {orderError.isTransient && ' Seus itens continuam no carrinho; tente confirmar novamente.'}
          </p>
        )}
        <p className="sr-only" aria-live="assertive">
          {placeOrder.retrying ? `Conexão instável, tentando novamente (${placeOrder.retrying}).` : ''}
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full font-bold" disabled={!quote || stale || blockingIssues || placeOrder.isPending || createQuote.isPending} onClick={confirm}>
            {placeOrder.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {placeOrder.retrying ? `Reenviando (${placeOrder.retrying})…` : 'Enviando pedido…'}
              </>
            ) : quote ? (
              `Confirmar e pagar · ${formatEth(quote.total)}`
            ) : (
              'Calculando…'
            )}
          </Button>
          {quote && <p className="text-center text-xs text-muted-foreground">Cotação válida até {new Date(quote.expiresAt).toLocaleTimeString('pt-BR')}.</p>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
