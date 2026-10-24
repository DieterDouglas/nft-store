import type { Page, Request } from '@playwright/test'
import { expect, isMobile, open, scenario, test } from './fixtures'

/** Filters live in the sidebar (desktop) or in the bottom sheet opened by the filter button (mobile). */
async function filters(page: Page) {
  if (!isMobile(page)) return page.getByRole('complementary', { name: 'Filtros' })
  const sheet = page.getByRole('dialog', { name: 'Filtros' })
  if (!(await sheet.isVisible())) await page.getByRole('button', { name: /^Filtros e ordenação/ }).click()
  return sheet
}

async function closeFilters(page: Page) {
  if (isMobile(page) && (await page.getByRole('dialog', { name: 'Filtros' }).isVisible())) await page.keyboard.press('Escape')
}

const cardNames = (page: Page) => page.locator('#catalogo').getByRole('article').locator('h3')

const catalogRequest = (page: Page, check: (params: URLSearchParams) => boolean) =>
  page.waitForRequest((r: Request) => {
    const url = new URL(r.url())
    return url.pathname === '/api/nfts' && check(url.searchParams)
  })

test('busca e filtros combinados refletem na URL, na API e sobrevivem a voltar/refresh', async ({ page }) => {
  await open(page, '/?q=Golden')
  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Golden Frequency #071', 'Golden Signal #160'])

  // Category: sent to the API and kept in the URL.
  const musicRequest = catalogRequest(page, (p) => p.get('q') === 'Golden' && p.getAll('category').includes('musica'))
  await (await filters(page)).getByRole('button', { name: /^Música/ }).click()
  await musicRequest
  await expect(page).toHaveURL(/category/)

  // Combined with network: only Polygon pieces of the "Golden" music set remain.
  const polygonRequest = catalogRequest(page, (p) => p.getAll('category').includes('musica') && p.getAll('network').includes('polygon'))
  await (await filters(page)).getByRole('button', { name: /^Polygon/ }).click()
  const req = await polygonRequest
  expect(new URL(req.url()).searchParams.get('page')).toBe('1')
  await closeFilters(page)
  await expect(cardNames(page)).toHaveText(['Golden Beat #207'])

  // History: back restores the previous filter set; refresh keeps the current one.
  await page.goBack()
  await expect(page).not.toHaveURL(/network/)
  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Golden Frequency #071', 'Golden Signal #160'])
  await page.goForward()
  await expect(cardNames(page)).toHaveText(['Golden Beat #207'])
  await page.reload()
  await expect(cardNames(page)).toHaveText(['Golden Beat #207'])
})

test('paginação, ordenação e reinício da página ao mudar filtro', async ({ page }) => {
  await open(page, '/')
  await expect(cardNames(page)).toHaveCount(9) // first page fully rendered before reading it
  const firstPage = await cardNames(page).allTextContents()

  await page.getByRole('link', { name: 'Página 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(cardNames(page).first()).not.toHaveText(firstPage[0])
  await expect(page.getByRole('link', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')

  // Sort ascending by price: the API receives it and the grid is ordered.
  const sortRequest = catalogRequest(page, (p) => p.get('sort') === 'price-asc')
  if (isMobile(page)) {
    await (await filters(page)).getByLabel('Ordenar por').click()
  } else {
    await page.getByLabel('Ordenar por:').click()
  }
  await page.getByRole('option', { name: 'Menor preço' }).click()
  await sortRequest
  await closeFilters(page)
  await expect(page).not.toHaveURL(/page=2/) // filter/sort change resets pagination
  const prices = (await page.locator('#catalogo').getByRole('article').locator('p > span:first-child').allTextContents()).map((t) => Number.parseFloat(t))
  expect(prices).toEqual([...prices].sort((a, b) => a - b))
})

test('respostas fora de ordem não sobrescrevem o filtro mais recente', async ({ page }) => {
  await open(page, '/?q=Golden')
  await expect(cardNames(page)).toHaveCount(3)
  // 1st catalog request after this takes 1.8 s, the 2nd only 0.2 s.
  await scenario(page, 'out-of-order')

  const panel = await filters(page)
  await panel.getByRole('button', { name: /^Música/ }).click() // slow response
  await panel.getByRole('button', { name: /^Solana/ }).click() // fast response, newest state
  await closeFilters(page)
  await expect(cardNames(page)).toHaveText(['Golden Frequency #071'])

  // Wait past the slow response: it must not replace what is on screen.
  await page.waitForTimeout(2_000)
  await expect(cardNames(page)).toHaveText(['Golden Frequency #071'])
  await expect(page).toHaveURL(/network/)
})

test('acesso direto ao detalhe e tratamento de recursos inexistentes', async ({ page }) => {
  await open(page, '/nft/nft-003')
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Vessel #552' })).toBeVisible()

  await page.goto('/nft/nao-existe')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver catálogo' })).toBeVisible()

  await page.goto('/rota/que/nao/existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('edição indisponível, NFT esgotado e limite de quantidade', async ({ page }) => {
  // nft-006 (Ivory Baron): the 1/10 edition is sold out.
  await open(page, '/nft/nft-006')
  await expect(page.getByRole('radio', { name: /1\/10 — Edição gênesis, esgotada/ })).toBeDisabled()

  // 1/10 edition of nft-001 allows at most 3 per order.
  await page.goto('/nft/nft-001')
  await page.getByRole('radio', { name: /1\/10/ }).check({ force: true })
  const more = page.getByRole('button', { name: 'Aumentar quantidade' })
  await more.click()
  await more.click()
  await expect(more).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('3')

  // nft-021 is entirely sold out: buying is not possible.
  await page.goto('/nft/nft-021')
  await expect(page.getByRole('button', { name: /^(COMPRAR|Comprar NFT|Edição esgotada)$/ })).toBeDisabled()
})
