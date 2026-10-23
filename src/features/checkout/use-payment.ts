import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import type { Buyer, User, Wallet, WalletConnection } from '@/api/types'
import { buyerSchema } from '@/features/account/schemas'
import { useCart, useCartQuote } from '@/features/cart/hooks'
import { focusFirstInvalid, useFormErrors } from '@/hooks/use-form-errors'
import { useSession } from '@/hooks/use-session'
import { checkoutStorage, type BuyerForm, type CheckoutDraft } from './order-attempt'

function initialDraft(userId: string, user: User, wallet: Wallet): CheckoutDraft {
  const stored = checkoutStorage.draft(userId)
  if (stored) return stored
  return {
    walletId: wallet.id,
    network: wallet.network,
    buyer: {
      displayName: wallet.displayName || user.name,
      username: user.username,
      profileName: wallet.profileName,
      email: wallet.email || user.email,
      ensName: wallet.ensName ?? user.ensName ?? '',
      referralCode: wallet.referralCode ?? '',
      note: '',
    },
  }
}

/**
 * Payment page state shared by the desktop and mobile layouts: persisted draft (survives
 * session expiry), selected wallet/network, simulated wallet handshake and the submit that
 * validates, connects and then opens the review dialog (`buyer` set).
 */
export function usePayment(wallets: Wallet[]) {
  const session = useSession()!
  const userId = session.user.id
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(() => initialDraft(userId, session.user, wallets[0]))
  useEffect(() => checkoutStorage.saveDraft(userId, draft), [userId, draft])

  const wallet = wallets.find((w) => w.id === draft.walletId) ?? wallets[0]
  const cart = useCart()
  const quote = useCartQuote(draft.network)
  const { errors, validate } = useFormErrors<BuyerForm>()
  const [buyer, setBuyer] = useState<Buyer | null>(null)

  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const connected = connection?.walletId === wallet.id && connection.network === draft.network
  const connect = useMutation({ mutationFn: () => api.wallets.connect(wallet.id, draft.network), onSuccess: setConnection })

  const setField = (key: keyof BuyerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, buyer: { ...d.buyer, [key]: e.target.value } }))

  const choose = (patch: Partial<CheckoutDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    // A new wallet or network needs a new handshake.
    setConnection(null)
    connect.reset()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = validate(buyerSchema, draft.buyer)
    if (!data) return focusFirstInvalid(formRef.current)
    if (!connected) {
      try {
        await connect.mutateAsync()
      } catch {
        return // error shown next to the wallet list
      }
    }
    setBuyer(data)
  }

  return {
    formRef,
    draft,
    setField,
    choose,
    wallet,
    wallets,
    secondary: wallets.find((w) => w.role === 'secondary'),
    cart,
    quote,
    errors,
    connect,
    connected,
    disconnect: () => setConnection(null),
    submit,
    buyer,
    closeReview: () => setBuyer(null),
  }
}

export type Payment = ReturnType<typeof usePayment>
