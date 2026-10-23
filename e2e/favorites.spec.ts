import type { Page } from '@playwright/test'
import { expect, login, open, scenario, test } from './fixtures'

const NFT = 'Golden Signal #160'

/**
 * The detail page's own favorite toggle: "Favoritar"/"Favoritado" (desktop) or the top-bar heart
 * named after the NFT (mobile). Cards in the shelf below have their own hearts, so match exactly.
 */
const favoriteToggle = (page: Page) =>
  page.getByRole('button', { name: new RegExp(`^(Favoritar|Favoritado|Favoritar ${NFT}|Remover ${NFT} dos favoritos)$`) })

test('visitante: o coração do card abre o login sobre a página', async ({ page }) => {
  await open(page, '/')
  const card = page.getByRole('article', { name: 'Sage Nomad #009' })
  await card.hover()
  await card.getByRole('link', { name: 'Entre para favoritar Sage Nomad #009' }).click()
  await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()
  await expect(page).toHaveURL(/\/\?auth=entrar/)
})

test('favoritar persiste para o usuário e aparece na lista de interesse', async ({ page }) => {
  await login(page)
  await page.goto('/nft/nft-009')
  const toggle = favoriteToggle(page)
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(`"${NFT}" adicionado aos favoritos.`)).toBeVisible()

  // Persisted server-side: survives a reload and shows in the wishlist.
  await page.reload()
  await expect(favoriteToggle(page)).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/favoritos')
  await expect(page.getByRole('article', { name: 'Golden Signal #160' })).toBeVisible()
})

test('falha ao favoritar desfaz a atualização otimista e permite tentar de novo', async ({ page }) => {
  await login(page)
  await page.goto('/nft/nft-009')
  const toggle = favoriteToggle(page)
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await scenario(page, 'favorite-fail')
  await toggle.click()
  // Rollback: back to "not favorite" with an explanatory message.
  await expect(page.getByText('Não foi possível atualizar "Golden Signal #160" nos favoritos. A alteração foi desfeita.')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  // Recovery: once the API is healthy the same action succeeds.
  await scenario(page, 'default')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  // The heart flips optimistically; wait for the server confirmation before reloading.
  await expect(page.getByText(`"${NFT}" adicionado aos favoritos.`)).toBeVisible()
  await page.reload()
  await expect(favoriteToggle(page)).toHaveAttribute('aria-pressed', 'true')
})

test('favoritos são privados: outro usuário não vê os da Ana', async ({ page }) => {
  await login(page, 'ana')
  await page.goto('/favoritos')
  await expect(page.getByRole('article', { name: 'Neon Vessel #552' })).toBeVisible()

  // Switch account in the same tab: private cache from Ana must not leak to Bruno.
  await login(page, 'bruno')
  await page.goto('/favoritos')
  await expect(page.getByText('Nenhum favorito ainda')).toBeVisible()
  await expect(page.getByRole('article', { name: 'Neon Vessel #552' })).toHaveCount(0)
})
