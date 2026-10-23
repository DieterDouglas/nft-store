import type { Page } from '@playwright/test'
import { addFromDetail, expect, isMobile, login, mock, open, openReview, test } from './fixtures'

const NFT = 'Golden Signal #160'

/** Where the detail page shows the selected edition price. */
const priceArea = (page: Page) => (isMobile(page) ? page.getByRole('region', { name: 'Comprar' }) : page.getByRole('article', { name: NFT }))

test('eventos duplicados e antigos não regridem o preço (versionamento via Socket.IO)', async ({ page }) => {
  await open(page, '/nft/nft-009')
  await expect(priceArea(page).getByText('0.39 ETH')).toBeVisible()

  await mock(page, 'nfts/nft-009', { editionId: 'aberta', price: '0.49' }, 'PATCH') // version 2
  await expect(priceArea(page).getByText('0.49 ETH')).toBeVisible()
  await mock(page, 'nfts/nft-009', { editionId: 'aberta', price: '0.59' }, 'PATCH') // version 3
  await expect(priceArea(page).getByText('0.59 ETH')).toBeVisible()

  // Server re-sends the last events as duplicates, then in reverse (v3, v2).
  await mock(page, 'events/replay', { count: 2 })
  await page.waitForTimeout(1_000)
  await expect(priceArea(page).getByText('0.59 ETH')).toBeVisible()
  await expect(priceArea(page).getByText('0.49 ETH')).toHaveCount(0)
})

test('após reconectar, o carrinho é reconciliado com a API REST', async ({ page }) => {
  await open(page, '/')
  await addFromDetail(page, 'nft-009')
  await expect(page.getByText('0.3948 ETH', { exact: true })).toBeVisible()

  // Socket down for 3 s; the price changes meanwhile, so its event is lost.
  await mock(page, 'socket/drop', { offlineMs: 3_000 })
  await mock(page, 'nfts/nft-009', { editionId: 'aberta', price: '0.45' }, 'PATCH')
  await page.waitForTimeout(500)
  await expect(page.getByText('0.3948 ETH', { exact: true })).toBeVisible()

  // On reconnect the client refetches active queries: the change shows up.
  await expect(page.getByText('Preços foram atualizados enquanto você navegava.', { exact: false })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('0.4548 ETH', { exact: true })).toBeVisible()
})

test('pedido pendente com socket caído é retomado após reload, sem duplicar a compra', async ({ page }) => {
  await login(page)
  await addFromDetail(page, 'nft-009')
  await openReview(page)

  const orderPosts: string[] = []
  page.on('request', (r) => r.url().endsWith('/api/orders') && r.method() === 'POST' && orderPosts.push(r.url()))

  // Realtime unavailable for 8 s: confirmation must arrive through the REST fallback.
  await mock(page, 'socket/drop', { offlineMs: 8_000 })
  await page.getByRole('button', { name: /Confirmar e pagar/ }).click()
  await expect(page).toHaveURL(/\/pedidos\/ord-/)
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação da rede' })).toBeVisible()
  await expect(page.getByText(/Conexão em tempo real instável/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
  expect(orderPosts).toHaveLength(1)
})

test('relógio controlado: a sessão expira após 1 h sem esperar em tempo real', async ({ page }) => {
  await page.clock.install()
  await login(page, 'ana', '/perfil')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

  // Session TTL is 60 min; jump 61 min ahead and trigger a private request.
  await page.clock.fastForward('01:01:00')
  await page.goto('/carteiras')
  await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()
  await expect(page).toHaveURL(/auth=entrar/)
})
