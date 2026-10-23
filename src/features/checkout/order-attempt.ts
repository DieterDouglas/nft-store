import type { CreateOrderRequest, Network } from '@/api/types'

/**
 * Checkout context persisted per user (localStorage): the form draft, so an expired
 * session can resume where it stopped, and the in-flight order attempt, so a reload or
 * a timeout re-sends the *same* idempotency key and body instead of buying twice.
 */

/** Raw form values (strings) of the payment page's collector profile. */
export interface BuyerForm {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
}

export interface CheckoutDraft {
  buyer: BuyerForm
  walletId: string | null
  network: Network
}

export interface OrderAttempt {
  key: string
  body: CreateOrderRequest
}

const draftKey = (userId: string) => `kurio.checkout.draft.v2.${userId}`
const attemptKey = (userId: string) => `kurio.checkout.attempt.${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: recovery after reload is lost, idempotency within the page still holds
  }
}

export const checkoutStorage = {
  draft: (userId: string) => read<CheckoutDraft>(draftKey(userId)),
  saveDraft: (userId: string, draft: CheckoutDraft) => write(draftKey(userId), draft),
  attempt: (userId: string) => read<OrderAttempt>(attemptKey(userId)),
  saveAttempt: (userId: string, attempt: OrderAttempt | null) => write(attemptKey(userId), attempt),
  clear(userId: string) {
    write(draftKey(userId), null)
    write(attemptKey(userId), null)
  },
}

export function newIdempotencyKey() {
  return `ord-${crypto.randomUUID()}`
}
