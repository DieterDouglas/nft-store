import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { api, qk } from '@/api/endpoints'
import { NETWORKS, WALLET_PROVIDERS, type Wallet, type WalletRole } from '@/api/types'
import { Field } from '@/components/shared/Field'
import { QueryError } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccountLayout } from '@/features/account/AccountLayout'
import { walletSchema } from '@/features/account/schemas'
import { focusFirstInvalid, useFormErrors } from '@/hooks/use-form-errors'
import { useSession } from '@/hooks/use-session'
import { NETWORK_LABEL, PROVIDER_LABEL } from '@/lib/labels'

export const Route = createFileRoute('/_auth/carteiras')({
  validateSearch: z.object({ voltar: z.enum(['checkout']).optional().catch(undefined) }),
  component: WalletsPage,
})

type FormValues = {
  displayName: string
  label: string
  network: string
  profileName: string
  address: string
  altAddress: string
  provider: string
  referralCode: string
  email: string
  ensName: string
}

const EMPTY: FormValues = { displayName: '', label: '', network: '', profileName: '', address: '', altAddress: '', provider: '', referralCode: '', email: '', ensName: '' }

const fromWallet = (w: Wallet): FormValues => ({
  displayName: w.displayName,
  label: w.label,
  network: w.network,
  profileName: w.profileName,
  address: w.address,
  altAddress: w.altAddress ?? '',
  provider: w.provider,
  referralCode: w.referralCode ?? '',
  email: w.email,
  ensName: w.ensName ?? '',
})

function WalletForm({ role, initial }: { role: WalletRole; initial: FormValues }) {
  const userId = useSession()!.user.id
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState(initial)
  const { errors, validate, fromApi } = useFormErrors<FormValues>()
  const save = useMutation({
    mutationFn: (body: z.infer<typeof walletSchema>) => api.wallets.upsert(role, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.wallets(userId) })
      toast.success(role === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
    },
    onError: (e) => {
      fromApi(e)
      focusFirstInvalid(formRef.current)
    },
  })
  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value })

  return (
    <form
      ref={formRef}
      noValidate
      aria-label={role === 'primary' ? 'Dados da carteira principal' : 'Dados da carteira secundária'}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        const data = validate(walletSchema, values)
        if (data) save.mutate(data)
        else focusFirstInvalid(formRef.current)
      }}
    >
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(a11y) => <Input {...a11y} value={values.displayName} onChange={set('displayName')} className="h-12" />}
        </Field>
        <Field label="Apelido da carteira" required error={errors.label}>
          {(a11y) => <Input {...a11y} value={values.label} onChange={set('label')} className="h-12" placeholder="Ex.: MetaMask pessoal" />}
        </Field>
        <Field label="Rede" required error={errors.network}>
          {(a11y) => (
            <Select value={values.network} onValueChange={(v) => setValues({ ...values, network: v })}>
              <SelectTrigger {...a11y} className="h-12 w-full data-[size=default]:h-12">
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
          {(a11y) => <Input {...a11y} value={values.profileName} onChange={set('profileName')} className="h-12" />}
        </Field>
        <Field
          label="Endereço da carteira"
          required
          error={errors.address}
          hint={values.network === 'solana' ? 'Endereço base58 (32–44 caracteres).' : undefined}
        >
          {(a11y) => (
            <Input
              {...a11y}
              value={values.address}
              onChange={set('address')}
              placeholder={values.network === 'solana' ? 'Endereço Solana da carteira' : 'Endereço 0x da carteira'}
              spellCheck={false}
              autoComplete="off"
              className="h-12 font-mono text-xs"
            />
          )}
        </Field>
        <Field label="ENS ou carteira secundária (opcional)" error={errors.altAddress}>
          {(a11y) => (
            <Input {...a11y} value={values.altAddress} onChange={set('altAddress')} placeholder="ENS ou carteira secundária (opcional)" spellCheck={false} className="h-12 font-mono text-xs" />
          )}
        </Field>
        <Field label="Tipo de carteira" required error={errors.provider}>
          {(a11y) => (
            <Select value={values.provider} onValueChange={(v) => setValues({ ...values, provider: v })}>
              <SelectTrigger {...a11y} className="h-12 w-full data-[size=default]:h-12">
                <SelectValue placeholder="Selecione uma carteira" />
              </SelectTrigger>
              <SelectContent>
                {WALLET_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Código de indicação (opcional)" error={errors.referralCode}>
          {(a11y) => <Input {...a11y} value={values.referralCode} onChange={set('referralCode')} autoCapitalize="characters" className="h-12" />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" value={values.email} onChange={set('email')} className="h-12" />}
        </Field>
        <Field label="Nome ENS (opcional)" error={errors.ensName}>
          {(a11y) => (
            <div className="flex gap-3">
              <span aria-hidden className="grid h-12 place-items-center rounded-md border border-input px-4 text-sm">
                .eth
              </span>
              <Input {...a11y} value={values.ensName} onChange={set('ensName')} className="h-12" />
            </div>
          )}
        </Field>
      </div>
      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 font-bold" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}

function WalletsPage() {
  const { voltar } = Route.useSearch()
  const userId = useSession()!.user.id
  const wallets = useQuery({ queryKey: qk.wallets(userId), queryFn: ({ signal }) => api.wallets.list({ signal }) })
  const [adding, setAdding] = useState<Record<WalletRole, boolean>>({ primary: false, secondary: false })
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  const primary = wallets.data?.find((w) => w.role === 'primary')
  const secondary = wallets.data?.find((w) => w.role === 'secondary')
  const secondaryInitial: FormValues = secondary
    ? fromWallet(secondary)
    : sameAsPrimary && primary
      ? { ...fromWallet(primary), label: '', address: '', altAddress: '' }
      : EMPTY

  return (
    <AccountLayout>
      {voltar === 'checkout' && (
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/checkout">
            <ArrowLeft /> Voltar ao pagamento
          </Link>
        </Button>
      )}
      {wallets.isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="shimmer h-20 rounded-md" />
          ))}
        </div>
      ) : wallets.isError ? (
        <QueryError error={wallets.error} onRetry={() => void wallets.refetch()} />
      ) : (
        <div className="space-y-12">
          <section aria-labelledby="carteira-principal" className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 id="carteira-principal" className="font-bold">
                  Carteira principal
                </h1>
                <p className="text-sm text-primary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
              </div>
              {!primary && !adding.primary && (
                <Button variant="link" className="px-0 font-bold" onClick={() => setAdding((a) => ({ ...a, primary: true }))}>
                  Adicionar
                </Button>
              )}
            </div>
            {primary || adding.primary ? (
              // Keyed by updatedAt so the form resets to the saved values after each save.
              <WalletForm key={`primary-${primary?.updatedAt ?? 'new'}`} role="primary" initial={primary ? fromWallet(primary) : EMPTY} />
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira principal.</p>
            )}
          </section>

          <section aria-labelledby="carteira-secundaria" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="carteira-secundaria" className="font-bold">
                  Carteira secundária
                </h2>
                {!secondary && !adding.secondary && <p className="text-sm text-primary">Você ainda não adicionou uma carteira secundária.</p>}
              </div>
              {!secondary && primary && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="same-as-primary" checked={sameAsPrimary} onCheckedChange={(v) => setSameAsPrimary(v === true)} className="rounded-full" />
                    <Label htmlFor="same-as-primary" className="font-normal">
                      Igual à carteira principal
                    </Label>
                  </div>
                  {!adding.secondary && (
                    <Button variant="link" className="px-0 font-bold" onClick={() => setAdding((a) => ({ ...a, secondary: true }))}>
                      Adicionar
                    </Button>
                  )}
                </div>
              )}
            </div>
            {!primary ? (
              <p className="text-sm text-muted-foreground">Cadastre a carteira principal primeiro.</p>
            ) : (
              (secondary || adding.secondary) && (
                <WalletForm key={`secondary-${secondary?.updatedAt ?? (sameAsPrimary ? 'copy' : 'new')}`} role="secondary" initial={secondaryInitial} />
              )
            )}
          </section>
        </div>
      )}
    </AccountLayout>
  )
}
