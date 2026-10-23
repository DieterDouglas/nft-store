import type { Page } from '@playwright/test'
import { expect, login, open, test } from './fixtures'

/**
 * Visual regression of the four screens required by the brief, per project (desktop/mobile).
 * Data is deterministic (seeded mocks); fonts/images are awaited; the QA mock-panel button
 * (live socket status dot) is masked. Baselines live next to this file and are versioned.
 */

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    // Lazy images below the fold never load without scrolling: load them eagerly for the shot.
    const pending = [...document.images].filter((img) => {
      if (img.loading === 'lazy') img.loading = 'eager'
      return !img.complete
    })
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          }),
      ),
    )
  })
}

const snapshot = (page: Page, name: string) =>
  expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    mask: [page.getByRole('button', { name: /painel de cenários/i })],
  })

/** Seeds the signed-in cart through the API (no UI toasts in the shot). */
async function seedCart(page: Page) {
  await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('kurio.session')!)
    for (const [nftId, quantity] of [
      ['nft-001', 2],
      ['nft-005', 6],
      ['nft-006', 9],
    ] as const) {
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ nftId, editionId: 'aberta', quantity }),
      })
    }
  })
}

test('início', async ({ page }) => {
  await open(page, '/')
  await expect(page.locator('#catalogo').getByRole('article')).toHaveCount(9)
  await settle(page)
  await snapshot(page, 'home')
})

test('detalhe do NFT', async ({ page }) => {
  await open(page, '/nft/nft-001')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await settle(page)
  await snapshot(page, 'detail')
})

test('carrinho', async ({ page }) => {
  await login(page)
  await seedCart(page)
  await page.goto('/carrinho')
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()
  await settle(page)
  await snapshot(page, 'cart')
})

test('pagamento', async ({ page }) => {
  await login(page)
  await seedCart(page)
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible()
  await expect(page.getByText('26.846 ETH').first()).toBeVisible()
  await settle(page)
  await snapshot(page, 'payment')
})
