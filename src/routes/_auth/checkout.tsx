import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Check, Loader2, Unplug } from 'lucide-react'
import { toApiError } from '@/api/client'
import { api, qk } from '@/api/endpoints'
import { NETWORKS, type Network, type Wallet } from '@/api/types'
import { Breadcrumb, MARKET_TRAIL } from '@/components/shared/Breadcrumb'
import { Field } from '@/components/shared/Field'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CouponForm } from '@/features/cart/CouponForm'
import { useCart } from '@/features/cart/hooks'
import { OrderSummarySkeleton, SummaryRows } from '@/features/cart/OrderSummary'
import { MobilePayment } from '@/features/checkout/MobilePayment'
import { checkoutStorage } from '@/features/checkout/order-attempt'
import { ReviewDialog } from '@/features/checkout/ReviewDialog'
import { usePayment } from '@/features/checkout/use-payment'
import { usePlaceOrder } from '@/features/checkout/use-place-order'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useSession } from '@/hooks/use-session'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/lib/labels'
import { formatEth, mul } from '@/lib/money'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_auth/checkout')({
  component: Checkout,
})

const CRUMBS = [...MARKET_TRAIL, { label: 'Pagamento' }]

function Required() {
  return (
    <span aria-hidden className="text-primary">
      *
    </span>
  )
}

function Checkout() {
  const session = useSession()!
  const userId = session.user.id
  const isMobile = useIsMobile()
  const cart = useCart()
  const wallets = useQuery({ queryKey: qk.wallets(userId), queryFn: ({ signal }) => api.wallets.list({ signal }) })
  // An unresolved purchase attempt survived a reload/timeout: resume it with the same key.
  // Read once on mount so a normal in-flight submission never swaps the screen.
  const [pendingAttempt] = useState(() => checkoutStorage.attempt(userId))

  if (pendingAttempt) {
    return (
      <>
        <Breadcrumb items={CRUMBS} />
        <ResumeAttempt />
      </>
    )
  }
  if (cart.isPending || wallets.isPending) {
    return (
      <>
        <Breadcrumb items={CRUMBS} />
        <div className="grid gap-10 lg:grid-cols-[1fr_420px]" aria-busy="true" aria-label="Carregando pagamento">
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="shimmer h-16 rounded-md" />
            ))}
          </div>
          <OrderSummarySkeleton />
        </div>
      </>
    )
  }
  if (cart.isError) return <QueryError error={cart.error} onRetry={() => void cart.refetch()} />
  if (wallets.isError) return <QueryError error={wallets.error} onRetry={() => void wallets.refetch()} />
  // While an attempt is in flight the order may settle and empty the cart first; keep the page.
  if (!cart.data.items.length && !checkoutStorage.attempt(userId)) {
    return (
      <>
        <Breadcrumb items={CRUMBS} />
        <StateMessage
          className="my-10"
          title="Não há itens para pagar"
          description="Seu carrinho está vazio."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      </>
    )
  }
  if (!wallets.data.length) {
    return (
      <>
        <Breadcrumb items={CRUMBS} />
        <StateMessage
          className="my-10"
          title="Cadastre uma carteira para pagar"
          description="As carteiras cadastradas ficam disponíveis no pagamento e recebem os NFTs comprados."
          action={
            <Button asChild>
              <Link to="/carteiras" search={{ voltar: 'checkout' }}>
                Cadastrar carteira
              </Link>
            </Button>
          }
        />
      </>
    )
  }
  return isMobile ? <MobilePayment wallets={wallets.data} /> : <PaymentForm wallets={wallets.data} />
}

function PaymentForm({ wallets }: { wallets: Wallet[] }) {
  const { formRef, draft, setField, choose, wallet, secondary, cart, quote, errors, connect, connected, disconnect, submit, buyer, closeReview } = usePayment(wallets)
  const [showCoupon, setShowCoupon] = useState(false)

  return (
    <>
      <Breadcrumb items={CRUMBS} />
      <h1 className="sr-only">Pagamento</h1>
      <form ref={formRef} noValidate onSubmit={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
        <section aria-labelledby="perfil-colecionador" className="space-y-5">
          <h2 id="perfil-colecionador" className="font-bold">
            Perfil do colecionador
          </h2>
          <p className="text-xs text-muted-foreground">
            Campos com <Required /> são obrigatórios.
          </p>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Nome de exibição" required error={errors.displayName}>
              {(a11y) => <Input {...a11y} autoComplete="name" value={draft.buyer.displayName} onChange={setField('displayName')} className="h-11" />}
            </Field>
            <Field label="Nome de usuário" required error={errors.username}>
              {(a11y) => <Input {...a11y} autoComplete="username" value={draft.buyer.username} onChange={setField('username')} className="h-11" />}
            </Field>
            <Field label="Rede" required>
              {(a11y) => (
                <Select value={draft.network} onValueChange={(v) => choose({ network: v as Network })}>
                  <SelectTrigger {...a11y} className="h-11 w-full data-[size=default]:h-11">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABEL[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Nome do perfil" required error={errors.profileName}>
              {(a11y) => <Input {...a11y} value={draft.buyer.profileName} onChange={setField('profileName')} className="h-11" />}
            </Field>
            <Field label="Endereço da carteira" required hint="Definido pela carteira selecionada.">
              {(a11y) => <Input {...a11y} value={wallet.address} readOnly className="h-11 font-mono text-xs text-muted-foreground" />}
            </Field>
            <Field label="ENS ou carteira secundária (opcional)">
              {(a11y) => <Input {...a11y} value={wallet.altAddress ?? secondary?.address ?? ''} placeholder="ENS ou carteira secundária (opcional)" readOnly className="h-11 font-mono text-xs text-muted-foreground" />}
            </Field>
            <Field label="Tipo de carteira" required>
              {(a11y) => <Input {...a11y} value={PROVIDER_LABEL[wallet.provider]} readOnly className="h-11 text-muted-foreground" />}
            </Field>
            <Field label="Código de indicação (opcional)" error={errors.referralCode}>
              {(a11y) => <Input {...a11y} value={draft.buyer.referralCode} onChange={setField('referralCode')} autoCapitalize="characters" className="h-11" />}
            </Field>
            <Field label="E-mail" required error={errors.email}>
              {(a11y) => <Input {...a11y} type="email" autoComplete="email" value={draft.buyer.email} onChange={setField('email')} className="h-11" />}
            </Field>
            <Field label="Nome ENS (opcional)" error={errors.ensName}>
              {(a11y) => (
                <div className="flex">
                  <Input {...a11y} value={draft.buyer.ensName} onChange={setField('ensName')} className="h-11 rounded-r-none" />
                  <span className="grid h-11 place-items-center rounded-r-md border border-l-0 border-input px-3 text-sm">.eth</span>
                </div>
              )}
            </Field>
          </div>

          {secondary && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-secondary"
                checked={wallet.id === secondary.id}
                onCheckedChange={(checked) => choose({ walletId: checked ? secondary.id : wallets.find((w) => w.role === 'primary')!.id })}
                className="rounded-full"
              />
              <Label htmlFor="use-secondary" className="block font-normal">
                Usar outra carteira? <span className="text-muted-foreground">({secondary.label})</span>
              </Label>
            </div>
          )}

          <Field label="Observação do colecionador (opcional)" error={errors.note} className="max-w-md">
            {(a11y) => (
              <textarea
                {...a11y}
                rows={6}
                value={draft.buyer.note}
                onChange={setField('note')}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive"
              />
            )}
          </Field>
        </section>

        <aside aria-label="Seus NFTs e pagamento" className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <section aria-labelledby="seus-nfts">
            <h2 id="seus-nfts" className="mb-2 font-bold">
              Seus NFTs
            </h2>
            <div aria-hidden className="flex justify-between border-b border-border pb-2 text-sm font-bold">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <ul className="mt-3 space-y-2">
              {cart.data?.items.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-md bg-card p-1 pr-3 text-sm">
                  <img src={l.image} alt="" width={64} height={64} className="size-16 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground">ID do token: {l.tokenId}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">(x {l.quantity})</span>
                  <span className="font-bold text-primary tabular-nums">{formatEth(mul(l.unitPrice, l.quantity))}</span>
                </li>
              ))}
            </ul>
          </section>

          {cart.data?.couponCode || showCoupon ? (
            <CouponForm applied={cart.data?.couponCode ?? null} />
          ) : (
            <p className="text-center text-sm">
              Tem um código promocional?{' '}
              <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setShowCoupon(true)}>
                Aplique aqui
              </button>
            </p>
          )}

          {quote.isPending ? (
            <OrderSummarySkeleton />
          ) : quote.isError ? (
            <QueryError error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular os valores." />
          ) : (
            <div className="border-b border-border pb-4">
              <SummaryRows quote={quote.data} estimated stale={quote.isFetching} />
            </div>
          )}

          <fieldset>
            <legend className="mb-3 w-full text-center font-bold">Carteira e rede</legend>
            <RadioGroup value={wallet.id} onValueChange={(walletId) => choose({ walletId })} className="gap-3">
              {wallets.map((w) => (
                <Label
                  key={w.id}
                  htmlFor={`w-${w.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-4 font-normal has-data-[state=checked]:border-primary"
                >
                  <RadioGroupItem id={`w-${w.id}`} value={w.id} />
                  <span className="min-w-0">
                    <span className="block">{PROVIDER_LABEL[w.provider]}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {w.label} · {shortAddress(w.address)}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <div aria-live="polite" className="mt-3 text-sm">
              {connected ? (
                <p className="flex flex-wrap items-center justify-between gap-2 text-success">
                  <span className="flex items-center gap-2">
                    <Check className="size-4" aria-hidden /> {wallet.label} conectada em {NETWORK_LABEL[draft.network]}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={disconnect}>
                    <Unplug /> Desconectar
                  </Button>
                </p>
              ) : connect.isError ? (
                <p role="alert" className="text-destructive">
                  {toApiError(connect.error).message} Tente novamente ou escolha outra carteira.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">A carteira será conectada ao confirmar.</p>
              )}
            </div>
          </fieldset>

          <Button type="submit" size="lg" className="h-12 w-full font-bold" disabled={connect.isPending || quote.isPending}>
            {connect.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Aguardando a carteira…
              </>
            ) : (
              'Confirmar compra'
            )}
          </Button>
          <p className="text-center">
            <Link to="/carteiras" search={{ voltar: 'checkout' }} className={cn('text-xs text-primary hover:underline')}>
              Gerenciar carteiras
            </Link>
          </p>
        </aside>
      </form>

      {buyer && <ReviewDialog open onOpenChange={(open) => !open && closeReview()} buyer={buyer} wallet={wallet} network={draft.network} />}
    </>
  )
}

/** Shown after reload while an order attempt is unresolved: re-sends it with the same key. */
function ResumeAttempt() {
  const userId = useSession()!.user.id
  const navigate = useNavigate()
  const placeOrder = usePlaceOrder({ onPlaced: (order) => void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true }) })
  const attempt = checkoutStorage.attempt(userId)!

  useEffect(() => {
    placeOrder.place(attempt.body)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const error = placeOrder.error ? toApiError(placeOrder.error) : null
  return (
    <StateMessage
      tone={error ? 'error' : 'empty'}
      title={error ? 'Não foi possível recuperar a compra' : 'Recuperando sua compra…'}
      description={
        error
          ? `${error.message} Nenhuma cobrança duplicada foi feita.`
          : 'Encontramos uma tentativa de compra em andamento. Estamos consultando o pedido sem criar outro.'
      }
      action={
        error && (
          <div className="flex gap-2">
            <Button onClick={() => placeOrder.place(attempt.body)}>Tentar novamente</Button>
            <Button
              variant="outline"
              onClick={() => {
                checkoutStorage.saveAttempt(userId, null)
                void navigate({ to: '/carrinho' })
              }}
            >
              Voltar ao carrinho
            </Button>
          </div>
        )
      }
    />
  )
}
