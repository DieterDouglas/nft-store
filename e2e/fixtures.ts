import { test as base, expect, type Page } from '@playwright/test'

/**
 * Shared helpers. Every test gets a fresh browser context, so the MSW mock DB
 * (localStorage) starts from the seed: tests are isolated and order-independent.
 * Scenario/event control goes through the mock server's HTTP control plane.
 */

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@123', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@123', name: 'Bruno Cripto' },
}

export async function mock(page: Page, path: string, body: unknown = {}, method = 'POST') {
  const status = await page.evaluate(
    async ([p, b, m]) => (await fetch(`/api/__mock/${p}`, { method: m as string, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).status,
    [path, body, method] as const,
  )
  expect(status, `mock control ${path}`).toBeLessThan(300)
}

export const scenario = (page: Page, id: string) => mock(page, 'scenario', { id }, 'PUT')

/** Opens the app and waits until MSW and the Socket.IO connection are up. */
export async function open(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.getByRole('button', { name: /painel de cenários/i })).toBeVisible({ timeout: 20_000 })
  // The UI paints before MSW finishes booting; control-plane calls need the worker active.
  await expect(page.locator('html')).toHaveAttribute('data-mocks', 'ready', { timeout: 20_000 })
}

export async function login(page: Page, user: keyof typeof USERS = 'ana', from = '/') {
  // Login is a modal driven by ?auth=; it closes and continues to `redirect` on success.
  await open(page, `/?auth=entrar&redirect=${encodeURIComponent(from)}`)
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await dialog.getByLabel('E-mail', { exact: true }).fill(USERS[user].email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** The "mobile" project renders the app-like mobile frames (< 768px). */
export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Detail page buy button: "COMPRAR" (desktop) / "Comprar NFT" (mobile purchase bar). */
export const buyButton = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })

/** Buys an NFT edition from its detail page (adds to the cart and opens it). */
export async function addFromDetail(page: Page, nftId: string, { quantity = 1, edition }: { quantity?: number; edition?: RegExp } = {}) {
  await page.goto(`/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (edition) await page.getByRole('radio', { name: edition }).check({ force: true })
  for (let i = 1; i < quantity; i++) await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

/**
 * Units in the cart, as shown in the UI: header cart link (desktop) or the mobile tab bar.
 * Pages without a tab bar on mobile (detail/cart/checkout) are checked from the home page.
 */
export async function expectCartCount(page: Page, count: number) {
  const label = new RegExp(`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`)
  if (isMobile(page) && /\/(nft\/|carrinho|checkout)/.test(new URL(page.url()).pathname)) {
    await page.goto('/')
  }
  await expect(page.getByRole('link', { name: label }).first()).toBeVisible()
}

/** Opens the login modal over the current page from a visible trigger. */
export async function openLoginFromPage(page: Page) {
  const trigger = isMobile(page)
    ? page.getByRole('link', { name: /^Entre para favoritar/ }).first() // detail top bar / card heart
    : page.getByRole('link', { name: 'Entrar', exact: true })
  await trigger.click()
  return trigger
}

/** Signed-in state as the UI shows it: account menu (desktop) or "Favoritar" hearts (mobile). */
export async function expectSignedIn(page: Page, name: string) {
  // A signed-in heart is a toggle button ("Favoritar …" or "Remover … dos favoritos"); guests get a login link.
  if (isMobile(page)) await expect(page.getByRole('button', { name: /^(Favoritar .+|Remover .+ dos favoritos)$/ }).first()).toBeVisible()
  else await expect(page.getByRole('button', { name: `Conta de ${name}` })).toBeVisible()
}

/** Mobile payment keeps the collector data in a collapsible section. */
export async function showBuyerFields(page: Page) {
  if (!isMobile(page)) return
  const details = page.locator('details', { hasText: 'Dados do colecionador' })
  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) await details.locator('summary').click()
}

/** From the cart to the review dialog (collector profile is prefilled from the primary wallet). */
export async function openReview(page: Page) {
  await page.goto('/carrinho')
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('dialog', { name: 'Revise sua compra' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Confirmar e pagar/ })).toBeEnabled()
}

export const test = base
export { expect }
