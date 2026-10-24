import './index.css'
import { renderApp } from './app/App'
import { markMocksReady } from './app/mocks-ready'

/**
 * The app renders immediately; the MSW mock layer boots once the first route has rendered.
 * Network calls wait for `mocksReady`, and socket.io-client is imported only after the
 * mocks patched WebSocket (engine.io-client captures the constructor when evaluated).
 */
const router = renderApp(document.getElementById('root')!)

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  // Download the mock layer right away (in parallel with the rest of the app)…
  const mocksModule = import('./mocks/browser')
  let started = false
  const start = async () => {
    if (started) return
    started = true
    // …but only boot it (service worker registration, DB) after the first route painted.
    const { startMocks } = await mocksModule
    await startMocks()
    markMocksReady()
  }
  // Parse the large MSW bundle only after the initial route (lazy chunk) has painted.
  const unsubscribe = router.subscribe('onRendered', () => {
    unsubscribe()
    requestAnimationFrame(() => setTimeout(start))
  })
  // Safety net if no render event fires (e.g. an error before the first route renders).
  setTimeout(start, 3000)
} else {
  markMocksReady()
}
