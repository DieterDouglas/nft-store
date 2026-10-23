import type { Session, User } from './types'

/**
 * Session persisted in localStorage so it survives refresh. Only the opaque token and the
 * public user profile are stored — never credentials. Expiry is decided by the server.
 */

const SESSION_KEY = 'kurio.session'
const GUEST_CART_KEY = 'kurio.guestCartId'

export type SessionEndReason = 'logout' | 'expired'

type Listener = () => void
const listeners = new Set<Listener>()
const endListeners = new Set<(reason: SessionEndReason, previous: Session) => void>()

function read(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

let current: Session | null = read()

function write(next: Session | null) {
  current = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // storage unavailable: session lives only in memory
  }
  listeners.forEach((l) => l())
}

export const sessionStore = {
  get: () => current,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Fires once when a session ends, before subscribers see `null`. */
  onEnd(listener: (reason: SessionEndReason, previous: Session) => void) {
    endListeners.add(listener)
    return () => {
      endListeners.delete(listener)
    }
  },
  start(session: Session) {
    write(session)
  },
  updateUser(user: User) {
    if (current) write({ ...current, user })
  },
  end(reason: SessionEndReason) {
    const previous = current
    if (!previous) return
    endListeners.forEach((l) => l(reason, previous))
    write(null)
  },
}

export const guestCart = {
  get(): string | null {
    try {
      return localStorage.getItem(GUEST_CART_KEY)
    } catch {
      return null
    }
  },
  set(id: string | null) {
    try {
      if (id) localStorage.setItem(GUEST_CART_KEY, id)
      else localStorage.removeItem(GUEST_CART_KEY)
    } catch {
      // ignore
    }
  },
}
