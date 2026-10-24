/**
 * Resolves once the network layer can be used: immediately without mocks, or after MSW's
 * worker is controlling the page. The UI renders before this (static content and skeletons
 * paint early); only network calls wait on it (Axios interceptor, Socket.IO connection).
 */
let resolve!: () => void
export const mocksReady = new Promise<void>((r) => (resolve = r))

export function markMocksReady() {
  // Observable marker for E2E tests and debugging.
  document.documentElement.dataset.mocks = 'ready'
  resolve()
}
