import { addFromDetail, buyButton, expect, expectCartCount, login, mock, open, openReview, scenario, test } from './fixtures'

const RECEIPT = 'Seus NFTs agora estão na sua carteira'

test('compra completa: catálogo → detalhe → carrinho → pagamento → recibo confirmado', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expectCartCount(page, 2)

  await openReview(page)
  // 2 × 1.19 + Ethereum fee (0.0048 + 0.0007) = 2.3855
  await page.getByRole('button', { name: 'Confirmar e pagar · 2.3855 ETH' }).click()

  await expect(page).toHaveURL(/\/pedidos\/ord-/)
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação da rede' })).toBeVisible()
  // Confirmation arrives through Socket.IO (order.updated).
  await expect(page.getByRole('heading', { name: RECEIPT })).toBeVisible({ timeout: 10_000 })
  const items = page.getByRole('table')
  await expect(items.getByText('Emerald Ape #042')).toBeVisible()
  await expect(items.getByText('(x 2)')).toBeVisible()
  await expect(items.getByText('2.3855 ETH')).toBeVisible()
  // Purchased quantities left the cart.
  await expectCartCount(page, 0)
})

test('cupom no carrinho: inválido, expirado e válido refletem no resumo', async ({ page }) => {
  await open(page)
  await addFromDetail(page, 'nft-007') // Golden Beat 0.99
  const coupon = page.getByLabel('Código promocional')
  const total = page.getByLabel('Resumo')

  await coupon.fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido.')).toBeVisible()
  await expect(coupon).toHaveAttribute('aria-invalid', 'true')

  await coupon.fill('EXPIRADO20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom expirou.')).toBeVisible()

  await coupon.fill('kurio10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado', { exact: true })).toBeVisible()
  // 0.99 − 10% (0.099) + 0.0048 fee = 0.8958
  await expect(total.getByText('(-) 0.099 ETH')).toBeVisible()
  await expect(total.getByText('0.8958 ETH', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
  await expect(total.getByText('0.9948 ETH', { exact: true })).toBeVisible()
})

test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
  await login(page)
  await addFromDetail(page, 'nft-009')
  await openReview(page)
  await scenario(page, 'payment-declined')
  await page.getByRole('button', { name: /Confirmar e pagar/ }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Seus itens continuam no carrinho')).toBeVisible()
  await expectCartCount(page, 1)
})

test('clique repetido e timeout recuperam o MESMO pedido (idempotência)', async ({ page }) => {
  await login(page)
  await addFromDetail(page, 'nft-009')
  await openReview(page)
  await scenario(page, 'order-timeout')

  const orderRequests: string[] = []
  page.on('request', (r) => r.url().endsWith('/api/orders') && r.method() === 'POST' && orderRequests.push(r.headers()['idempotency-key']))

  // Repeated click: the second one must not create a second submission.
  await page.getByRole('button', { name: /Confirmar e pagar/ }).dblclick()
  await expect(page).toHaveURL(/\/pedidos\/ord-/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: RECEIPT })).toBeVisible({ timeout: 10_000 })

  // First request timed out, the retry reused the key: one key, one order.
  expect(orderRequests.length).toBeGreaterThanOrEqual(2)
  expect(new Set(orderRequests).size).toBe(1)
})

test('preço muda via Socket.IO durante a revisão e exige nova confirmação', async ({ page }) => {
  await login(page)
  await addFromDetail(page, 'nft-009') // Golden Signal 0.39
  await openReview(page)
  await expect(page.getByRole('button', { name: 'Confirmar e pagar · 0.3948 ETH' })).toBeVisible()

  await mock(page, 'nfts/nft-009', { editionId: 'aberta', price: '0.49' }, 'PATCH')
  await expect(page.getByText(/Preço ou disponibilidade de um item mudou/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Confirmar e pagar/ })).toBeDisabled()

  await page.getByRole('button', { name: 'Atualizar valores' }).click()
  await expect(page.getByText(/total anterior/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar e pagar · 0.4948 ETH' }).click()
  await expect(page.getByRole('heading', { name: RECEIPT })).toBeVisible({ timeout: 10_000 })
  // Receipt is a snapshot: later catalog changes do not alter it.
  await mock(page, 'nfts/nft-009', { editionId: 'aberta', price: '9.99' }, 'PATCH')
  await page.reload()
  await expect(page.getByText('1 × 0.49 ETH')).toBeVisible()
})
