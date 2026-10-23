/**
 * Deterministic network/business scenarios for the mock server.
 * Selected via ?scenario=<id> (persisted), the in-app mock panel, or PUT /api/__mock/scenario.
 */

export const SCENARIOS = {
  default: 'Padrão: latência variável curta (120–450 ms), tudo funciona',
  slow: 'Rede lenta: 2,5 s em todas as leituras (exibe skeletons)',
  'out-of-order': 'Respostas fora de ordem: buscas alternam 1,8 s e 0,2 s',
  empty: 'Catálogo vazio',
  offline: 'Sem conexão: toda chamada REST falha e o socket não conecta',
  'server-error': 'HTTP 500 no catálogo e no detalhe',
  flaky: 'Falha transitória: 1ª leitura de cada recurso retorna 503, a seguinte funciona',
  'favorite-fail': 'Favoritar/desfavoritar retorna 500 (rollback otimista)',
  'price-change': 'Preço do 1º item do carrinho sobe 1,5 s após a cotação do checkout',
  'sold-out': 'Edição do 1º item do carrinho esgota 1,5 s após a cotação do checkout',
  'order-timeout': 'Pedido é criado, mas a 1ª resposta demora além do timeout do cliente',
  'payment-declined': 'Pagamento é recusado pela rede simulada',
  'wallet-rejected': 'Usuário recusa a conexão da carteira',
} as const

export type ScenarioId = keyof typeof SCENARIOS

const KEY = 'kurio.mock.scenario'

export function isScenario(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIOS
}

export function getScenario(): ScenarioId {
  try {
    const stored = localStorage.getItem(KEY)
    return isScenario(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

export function setScenario(id: ScenarioId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // ignore: scenario falls back to default
  }
  flakyHits.clear()
  orderedRequests = 0
}

/** Reads ?scenario= on boot so demo links like /?scenario=slow work directly. */
export function applyScenarioFromUrl() {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (isScenario(fromUrl)) setScenario(fromUrl)
}

const flakyHits = new Set<string>()
let orderedRequests = 0

/** Pseudo-random but reproducible latency derived from the request key. */
function jitter(key: string, min: number, max: number) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return min + (Math.abs(h) % (max - min))
}

export function latencyFor(method: string, url: URL, endpoint: string): number {
  const scenario = getScenario()
  if (scenario === 'slow' && method === 'GET') return 2500
  if (scenario === 'out-of-order' && endpoint === 'catalog') {
    orderedRequests += 1
    return orderedRequests % 2 === 1 ? 1800 : 200
  }
  return jitter(`${method}${url.pathname}${url.search}`, 120, 450)
}

/** Returns the failure the current scenario injects for this request, if any. */
export function injectedFailure(method: string, url: URL, endpoint: string): 'network' | 500 | 503 | null {
  const scenario = getScenario()
  if (scenario === 'offline') return 'network'
  if (scenario === 'server-error' && (endpoint === 'catalog' || endpoint === 'detail')) return 500
  if (scenario === 'favorite-fail' && endpoint === 'favorites' && method !== 'GET') return 500
  if (scenario === 'flaky' && method === 'GET') {
    const key = `${endpoint}${url.pathname}`
    if (!flakyHits.has(key)) {
      flakyHits.add(key)
      return 503
    }
  }
  return null
}
