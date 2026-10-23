import './index.css'

/**
 * Mocks must start before the app graph is imported: engine.io-client captures
 * `globalThis.WebSocket` at module evaluation, so MSW has to patch it first.
 */
async function boot() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }
  const { renderApp } = await import('./app/App')
  renderApp(document.getElementById('root')!)
}

void boot()
