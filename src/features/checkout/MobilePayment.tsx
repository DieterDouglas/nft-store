import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, EllipsisVertical, Loader2, WalletMinimal } from 'lucide-react'
import { toApiError } from '@/api/client'
import type { Wallet, WalletProvider } from '@/api/types'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { Field } from '@/components/shared/Field'
import { QueryError } from '@/components/shared/StateMessage'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/lib/labels'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ReviewDialog } from './ReviewDialog'
import { usePayment } from './use-payment'

const card = 'flex cursor-pointer items-center gap-4 rounded-3xl bg-card p-5 transition-colors has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/60'

/** Wallet line from the frame: ENS when there is one, otherwise the short address. */
function walletIdentity(w: Wallet) {
  if (w.ensName) return `${w.ensName}.eth`
  if (w.altAddress?.endsWith('.eth')) return w.altAddress
  return shortAddress(w.address)
}

const networkLine = (w: Wallet) => (w.network === 'ethereum' ? 'Rede principal Ethereum' : `Rede ${NETWORK_LABEL[w.network]}`)

function ConnectorIcon({ provider }: { provider: WalletProvider }) {
  return (
    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-muted font-bold text-primary">
      {provider === 'coinbase' ? <WalletMinimal className="size-5" /> : provider === 'metamask' ? 'M' : 'W'}
    </span>
  )
}

export function MobilePayment({ wallets }: { wallets: Wallet[] }) {
  const { formRef, draft, setField, choose, wallet, quote, errors, connect, connected, disconnect, submit, buyer, closeReview } = usePayment(wallets)
  const [connector, setConnector] = useState<WalletProvider>(wallet.provider)
  const hasErrors = Object.keys(errors).length > 0
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="pb-32">
      <MobileTopBar title="Pagamento com carteira" />
      <h1 className="sr-only">Pagamento</h1>

      <form ref={formRef} noValidate onSubmit={submit} className="space-y-6">
        <fieldset className="space-y-4">
          <div className="flex items-center justify-between">
            <legend className="text-lg font-bold">Carteira conectada</legend>
            <Link to="/carteiras" search={{ voltar: 'checkout' }} className="font-bold text-primary">
              Trocar carteira
            </Link>
          </div>
          <RadioGroup
            value={wallet.id}
            onValueChange={(walletId) => {
              const next = wallets.find((w) => w.id === walletId)!
              // On mobile the network follows the chosen wallet ("Rede Polygon"…).
              choose({ walletId, network: next.network })
              setConnector(next.provider)
            }}
            className="gap-4"
          >
            {wallets.map((w) => (
              <div key={w.id} className="relative">
                <label htmlFor={`mw-${w.id}`} className={card}>
                  <RadioGroupItem id={`mw-${w.id}`} value={w.id} className="size-6" />
                  <span className="min-w-0 flex-1 space-y-1 pr-8">
                    <span className="block text-lg font-bold">{w.role === 'primary' ? 'Principal' : 'Reserva'}</span>
                    <span className="block truncate text-muted-foreground">{walletIdentity(w)}</span>
                    <span className="block text-sm text-muted-foreground">{networkLine(w)}</span>
                  </span>
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full text-primary hover:bg-muted"
                    aria-label={`Opções da carteira ${w.label}`}
                  >
                    <EllipsisVertical className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/carteiras" search={{ voltar: 'checkout' }}>
                        Editar carteira
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-4 text-lg font-bold">Carteira e rede</legend>
          <RadioGroup
            value={connector}
            onValueChange={(v) => {
              setConnector(v as WalletProvider)
              disconnect()
            }}
            className="gap-4"
          >
            {(['walletconnect', 'metamask', 'coinbase'] as const).map((provider) => (
              <label key={provider} htmlFor={`conn-${provider}`} className={cn(card, 'py-4')}>
                <ConnectorIcon provider={provider} />
                <span className="flex-1">{PROVIDER_LABEL[provider]}</span>
                <RadioGroupItem id={`conn-${provider}`} value={provider} className="size-6" />
              </label>
            ))}
          </RadioGroup>
          <div aria-live="polite" className="text-sm">
            {connected ? (
              <p className="flex items-center gap-2 text-success">
                <Check className="size-4" aria-hidden /> Conectada via {PROVIDER_LABEL[connector]} · {NETWORK_LABEL[draft.network]}
              </p>
            ) : connect.isError ? (
              <p role="alert" className="text-destructive">
                {toApiError(connect.error).message} Tente novamente ou escolha outra carteira.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">A conexão via {PROVIDER_LABEL[connector]} é solicitada ao confirmar.</p>
            )}
          </div>
        </fieldset>

        {/* The frame has no buyer form: data comes prefilled from the wallet; editable here. */}
        <details
          open={detailsOpen || hasErrors}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
          className="group rounded-3xl bg-card px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold [&::-webkit-details-marker]:hidden">
            <span>
              Dados do colecionador
              <span className="block text-xs font-normal text-muted-foreground">
                {draft.buyer.displayName || 'Preencha seus dados'} · {draft.buyer.email}
              </span>
            </span>
            <ChevronDown aria-hidden className="size-5 text-primary transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-4">
            <Field label="Nome de exibição" required error={errors.displayName}>
              {(a11y) => <Input {...a11y} autoComplete="name" value={draft.buyer.displayName} onChange={setField('displayName')} className="h-12" />}
            </Field>
            <Field label="Nome de usuário" required error={errors.username}>
              {(a11y) => <Input {...a11y} autoComplete="username" value={draft.buyer.username} onChange={setField('username')} className="h-12" />}
            </Field>
            <Field label="Nome do perfil" required error={errors.profileName}>
              {(a11y) => <Input {...a11y} value={draft.buyer.profileName} onChange={setField('profileName')} className="h-12" />}
            </Field>
            <Field label="E-mail" required error={errors.email}>
              {(a11y) => <Input {...a11y} type="email" autoComplete="email" value={draft.buyer.email} onChange={setField('email')} className="h-12" />}
            </Field>
            <Field label="Código de indicação (opcional)" error={errors.referralCode}>
              {(a11y) => <Input {...a11y} value={draft.buyer.referralCode} onChange={setField('referralCode')} autoCapitalize="characters" className="h-12" />}
            </Field>
            <Field label="Observação do colecionador (opcional)" error={errors.note}>
              {(a11y) => (
                <textarea
                  {...a11y}
                  rows={3}
                  value={draft.buyer.note}
                  onChange={setField('note')}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive"
                />
              )}
            </Field>
          </div>
        </details>

        <div className="flex items-baseline justify-end gap-6 text-xl font-bold" aria-live="polite">
          <span>Total:</span>
          {quote.isPending ? (
            <span className="shimmer h-7 w-32 rounded" aria-label="Calculando" />
          ) : quote.isError ? (
            <QueryError error={quote.error} onRetry={() => void quote.refetch()} />
          ) : (
            <span className={cn('text-2xl text-primary tabular-nums', quote.isFetching && 'opacity-60')}>{formatEth(quote.data.total)}</span>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-background via-background to-transparent px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={connect.isPending || quote.isPending}
            className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-linear-to-r from-primary to-[#b8733d] text-lg font-bold text-primary-foreground disabled:opacity-60"
          >
            {connect.isPending ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Aguardando a carteira…
              </>
            ) : (
              'Confirmar compra'
            )}
          </button>
        </div>
      </form>

      {buyer && <ReviewDialog open onOpenChange={(open) => !open && closeReview()} buyer={buyer} wallet={wallet} network={draft.network} />}
    </div>
  )
}
