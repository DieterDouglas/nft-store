import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/api/types'
import { commit, db, initDb, type MockUser } from './db'
import { injectedFailure, latencyFor } from './scenarios'

export const API = import.meta.env.VITE_API_URL ?? '/api'

export type Endpoint = 'catalog' | 'detail' | 'favorites' | 'cart' | 'quote' | 'orders' | 'account' | 'wallets' | 'admin'

export interface RouteContext<P = Record<string, string>> {
  request: Request
  url: URL
  params: P
  /** Authenticated user, when a valid session token was sent. */
  user: MockUser | null
  token: string | null
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

interface RouteOptions {
  /** 'required' rejects anonymous calls with 401; 'optional' resolves the user when present. */
  auth?: 'required' | 'optional'
  /** Skip simulated latency/failures (mock control endpoints). */
  raw?: boolean
}

export function apiError(status: number, code: ApiErrorCode, message: string, extra?: Partial<ApiErrorBody['error']>) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, ...extra } }, { status })
}

export function validationError(fields: Record<string, string>) {
  return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados.', { fields })
}

function resolveSession(request: Request): { token: string | null; user: MockUser | null; expired: boolean } {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { token: null, user: null, expired: false }
  const s = db()
  const session = s.sessions.find((x) => x.token === token)
  if (!session) return { token, user: null, expired: true }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    s.sessions = s.sessions.filter((x) => x.token !== token)
    commit()
    return { token, user: null, expired: true }
  }
  return { token, user: s.users.find((u) => u.id === session.userId) ?? null, expired: false }
}

export function route<P extends Record<string, string> = Record<string, string>>(
  method: Method,
  path: string,
  endpoint: Endpoint,
  handler: (ctx: RouteContext<P>) => Response | Promise<Response>,
  options: RouteOptions = {},
) {
  const resolver: HttpResponseResolver = async ({ request, params }) => {
    await initDb()
    const url = new URL(request.url)

    if (!options.raw) {
      await delay(latencyFor(request.method, url, endpoint))
      const failure = injectedFailure(request.method, url, endpoint)
      if (failure === 'network') return HttpResponse.error()
      if (failure === 500) return apiError(500, 'INTERNAL', 'Erro inesperado no servidor.')
      if (failure === 503) return apiError(503, 'TRANSIENT', 'Serviço temporariamente indisponível. Tente novamente.')
    }

    const { token, user, expired } = resolveSession(request)
    // A stale token is always reported, so the client notices expiry even on public pages.
    if (expired) return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
    if (options.auth === 'required' && !user) return apiError(401, 'UNAUTHENTICATED', 'Entre para continuar.')

    return handler({ request, url, params: params as P, user, token })
  }
  return http[method](`${API}${path}`, resolver)
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return {}
  }
}
