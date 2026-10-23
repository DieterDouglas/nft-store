import { setupWorker } from 'msw/browser'
import { settleDueOrders } from './commerce'
import { initDb } from './db'
import { accountHandlers } from './handlers/account'
import { adminHandlers } from './handlers/admin'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { checkoutHandlers } from './handlers/checkout'
import { favoriteHandlers } from './handlers/favorites'
import { walletHandlers } from './handlers/wallets'
import { realtimeHandler } from './realtime'
import { applyScenarioFromUrl } from './scenarios'

export const handlers = [
  ...adminHandlers,
  ...catalogHandlers,
  ...accountHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...walletHandlers,
  realtimeHandler,
]

export async function startMocks() {
  applyScenarioFromUrl()
  await initDb()
  const worker = setupWorker(...handlers)
  await worker.start({
    // Assets, fonts and Vite modules pass through untouched.
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
  // Simulated chain: settles pending orders even after a page reload.
  setInterval(settleDueOrders, 500)
}
