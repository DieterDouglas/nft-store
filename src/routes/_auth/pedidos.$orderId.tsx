import { useSyncExternalStore, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Copy, Loader2, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError } from '@/api/client'
import { api, qk } from '@/api/endpoints'
import type { Order } from '@/api/types'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useSession } from '@/hooks/use-session'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/lib/labels'
import { formatEth, isZero } from '@/lib/money'
import { connection } from '@/realtime/realtime'

export const Route = createFileRoute('/_auth/pedidos/$orderId')({
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  const userId = useSession()!.user.id
  const socketState = useSyncExternalStore(connection.subscribe, connection.get)

  const order = useQuery({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => api.checkout.order(orderId, { signal }),
    // Realtime is the primary channel; polling is the fallback while the socket is down.
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? (socketState === 'connected' ? 10_000 : 2_000) : false),
  })

  if (order.isPending) {
    return <div className="shimmer mx-auto my-16 h-140 max-w-2xl rounded-md" aria-busy="true" aria-label="Carregando pedido" />
  }
  if (order.isError) {
    const code = toApiError(order.error).code
    if (code === 'NOT_FOUND' || code === 'FORBIDDEN') {
      return (
        <StateMessage
          className="my-16"
          title={code === 'FORBIDDEN' ? 'Este pedido pertence a outra conta' : 'Pedido não encontrado'}
          action={
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          }
        />
      )
    }
    return <QueryError error={order.error} onRetry={() => void order.refetch()} />
  }

  const data = order.data
  if (data.status === 'confirmed') return <Receipt order={data} />
  return (
    <ReceiptCard>
      {data.status === 'pending' ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Loader2 aria-hidden className="size-10 animate-spin text-primary" />
          <h1 className="font-bold text-primary">Aguardando confirmação da rede</h1>
          <p className="text-sm text-muted-foreground">
            Pedido {data.id}. Você pode fechar esta página: o pedido continua sendo processado e não será duplicado.
          </p>
          {socketState !== 'connected' && <p className="text-xs text-primary">Conexão em tempo real instável — consultando o status periodicamente.</p>}
        </div>
      ) : (
        <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <XCircle aria-hidden className="size-10 text-destructive" />
          <h1 className="font-bold">Pagamento recusado</h1>
          <p className="text-sm text-muted-foreground">{data.declineReason}</p>
          <p className="text-sm">Seus itens continuam no carrinho e nenhum valor foi cobrado.</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild>
              <Link to="/checkout">Tentar com outra carteira</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/carrinho">Voltar ao carrinho</Link>
            </Button>
          </div>
        </div>
      )}
    </ReceiptCard>
  )
}

function ReceiptCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto my-12 max-w-2xl border-b-8 border-primary bg-card">
      <Link to="/" aria-label="Fechar e voltar ao início" className="absolute top-4 right-4 text-primary hover:opacity-80">
        <X className="size-5" />
      </Link>
      {children}
    </div>
  )
}

function ThankYouIcon() {
  return (
    <svg aria-hidden viewBox="0 0 64 72" className="h-20 w-20 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M6 30 32 50l26-20v38H6z" />
      <path d="M6 68 26 46M58 68 38 46" />
      <rect x="12" y="6" width="40" height="36" rx="3" fill="var(--card)" />
      <path d="M28 6c0-3 8-3 8 0" />
      <text x="32" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none" fontFamily="Space Mono, monospace">
        THANK
      </text>
      <text x="32" y="32" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none" fontFamily="Space Mono, monospace">
        YOU
      </text>
    </svg>
  )
}

/** Rendered only from the order snapshot: later catalog changes never alter it. */
function Receipt({ order }: { order: Order }) {
  const { receipt, transaction } = order
  const hash = transaction?.hash ?? ''
  // Layout format: "29 Jul, 2026"
  const created = new Date(order.createdAt)
  const month = created.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const date = `${created.getDate()} ${month[0].toUpperCase()}${month.slice(1)}, ${created.getFullYear()}`

  return (
    <ReceiptCard>
      <article aria-labelledby="recibo-titulo">
        <header className="flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center">
          <ThankYouIcon />
          <h1 id="recibo-titulo" className="font-bold text-primary">
            Seus NFTs agora estão na sua carteira
          </h1>
          <p className="sr-only" role="status">
            Pedido {order.id} confirmado.
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-y-3 border-y border-primary/60 px-6 py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary/60">
          <div className="sm:pr-4">
            <dt className="font-bold">ID da transação</dt>
            <dd className="text-muted-foreground">{hash ? `0x${hash.slice(2, 6).toUpperCase()}…${hash.slice(-4).toUpperCase()}` : '—'}</dd>
          </div>
          <div className="sm:px-4">
            <dt>Data</dt>
            <dd className="text-muted-foreground">{date}</dd>
          </div>
          <div className="sm:px-4">
            <dt>Total</dt>
            <dd className="text-muted-foreground tabular-nums">{formatEth(receipt.total)}</dd>
          </div>
          <div className="sm:pl-4">
            <dt className="font-bold">Carteira</dt>
            <dd className="text-muted-foreground">{PROVIDER_LABEL[receipt.wallet.provider]}</dd>
          </div>
        </dl>

        <section aria-labelledby="detalhes-transacao" className="px-6 py-6 sm:px-12">
          <h2 id="detalhes-transacao" className="mb-3 font-bold">
            Detalhes da transação
          </h2>
          <table className="w-full text-sm">
            <caption className="sr-only">Itens comprados no pedido {order.id}</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="pb-2 font-bold">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-center font-bold">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right font-bold">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((l) => (
                <tr key={`${l.nftId}-${l.editionId}`}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img src={l.image} alt="" width={56} height={56} className="size-14 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="font-bold">{l.name}</p>
                        <p className="text-xs text-muted-foreground">ID do token: {l.tokenId}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.editionLabel} · {l.quantity} × {formatEth(l.unitPrice)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center text-muted-foreground">(x {l.quantity})</td>
                  <td className="py-2 text-right font-bold text-primary tabular-nums">{formatEth(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-sm">
              {!isZero(receipt.discount) && (
                <tr>
                  <th scope="row" colSpan={2} className="pt-3 text-right font-normal">
                    Desconto{receipt.coupon && ` (${receipt.coupon.code})`}
                  </th>
                  <td className="pt-3 text-right tabular-nums">(-) {formatEth(receipt.discount)}</td>
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={2} className="pt-3 text-right font-normal">
                  Taxa de rede
                </th>
                <td className="pt-3 text-right text-base tabular-nums">{formatEth(receipt.networkFee)}</td>
              </tr>
              <tr className="border-b border-border">
                <th scope="row" colSpan={2} className="pt-1 pb-3 text-right">
                  Total
                </th>
                <td className="pt-1 pb-3 text-right text-lg font-bold text-primary tabular-nums">{formatEth(receipt.total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Transação confirmada na {NETWORK_LABEL[receipt.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <ExplorerDialog order={order} />
            <Link to="/" hash="catalogo" className="text-sm text-primary hover:underline">
              Continuar explorando
            </Link>
          </div>
        </section>
      </article>
    </ReceiptCard>
  )
}

/** Hashes are simulated, so the explorer is too: no external link that would 404. */
function ExplorerDialog({ order }: { order: Order }) {
  const hash = order.transaction?.hash
  if (!hash) return null
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="font-bold">
          Ver no Etherscan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Explorador de blocos (simulado)</DialogTitle>
          <DialogDescription>Esta demonstração não envia transações reais; os dados abaixo vêm da rede simulada.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Hash da transação</dt>
            <dd className="flex items-center gap-2">
              <code className="break-all text-xs">{hash}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar hash da transação"
                onClick={() => navigator.clipboard?.writeText(hash).then(() => toast.success('Hash copiado.'))}
              >
                <Copy />
              </Button>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="text-success">Confirmada</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Para</dt>
            <dd>
              {order.receipt.wallet.label} · {shortAddress(order.receipt.wallet.address)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valor</dt>
            <dd>{formatEth(order.receipt.total)}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  )
}
