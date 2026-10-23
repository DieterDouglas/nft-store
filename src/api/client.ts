import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { guestCart, sessionStore } from './session-store'
import type { ApiErrorBody, ApiErrorCode } from './types'

export const DEFAULT_TIMEOUT_MS = 10_000
/** Order creation gives up sooner; the retry reuses the idempotency key. */
export const ORDER_TIMEOUT_MS = 6_000

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

/** Normalised error every hook and component works with. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'NETWORK' | 'TIMEOUT' | 'CANCELED'
  readonly fields: Record<string, string>
  readonly details: unknown

  constructor(init: { status: number; code: ApiError['code']; message: string; fields?: Record<string, string>; details?: unknown }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fields = init.fields ?? {}
    this.details = init.details
  }

  /** Worth retrying automatically: connection problems and 5xx/503 transient failures. */
  get isTransient() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError({ status: 0, code: 'CANCELED', message: 'Requisição cancelada.' })
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou para responder.' })
    }
    const body = error.response?.data as ApiErrorBody | undefined
    if (error.response && body?.error) {
      return new ApiError({ status: error.response.status, ...body.error })
    }
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK', message: 'Sem conexão com o servidor. Verifique sua internet.' })
    }
    return new ApiError({ status: error.response.status, code: 'INTERNAL', message: 'Erro inesperado no servidor.' })
  }
  return new ApiError({ status: 0, code: 'INTERNAL', message: error instanceof Error ? error.message : 'Erro inesperado.' })
}

http.interceptors.request.use((config) => {
  const session = sessionStore.get()
  if (session) config.headers.set('Authorization', `Bearer ${session.token}`)
  else config.headers.set('X-Cart-Id', guestCart.ensure())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    // The token we sent is no longer valid: end the session once, app-wide.
    const sentToken = (error as AxiosError).config?.headers?.Authorization
    if (apiError.code === 'SESSION_EXPIRED' && sentToken === `Bearer ${sessionStore.get()?.token}`) {
      sessionStore.end('expired')
    }
    return Promise.reject(apiError)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<T>(config)
  return response.data
}
