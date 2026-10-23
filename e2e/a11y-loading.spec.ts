import { expect, isMobile, open, scenario, test } from './fixtures'

test.describe('teclado e foco', () => {
  test('link "Pular para o conteúdo" leva o foco ao conteúdo principal', async ({ page }) => {
    await open(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('diálogo de busca prende o foco e o devolve ao fechar', async ({ page }) => {
    await open(page, '/')
    const trigger = page.getByRole('button', { name: isMobile(page) ? 'Buscar NFTs' : 'Buscar', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog.getByLabel('Termo de busca')).toBeFocused()

    // Tabbing cycles inside the dialog (focus trap).
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
    }

    // Typing + Enter searches; the dialog closes and the catalog is filtered.
    await dialog.getByLabel('Termo de busca').fill('Golden')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=Golden/)
    await expect(dialog).toBeHidden()

    // Escape on reopen closes and returns focus to the trigger.
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('edições são um grupo de rádio navegável pelas setas', async ({ page }) => {
    await open(page, '/nft/nft-001')
    const open1 = page.getByRole('radio', { name: /^ABERTA/ })
    await expect(open1).toBeChecked()
    await open1.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('radio', { name: /^1\/50/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /^1\/50/ })).toBeFocused()
  })

  test('validação de formulário: erro associado ao campo e foco no primeiro inválido', async ({ page }) => {
    await open(page, '/?auth=cadastro')
    const dialog = page.getByRole('dialog', { name: 'Criar conta na Kurio' })
    await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).press('Enter')

    const username = dialog.getByLabel('Nome de usuário')
    await expect(username).toBeFocused()
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    // The message is programmatically tied to the input.
    await expect(username).toHaveAccessibleDescription(/Use de 3 a 30 letras minúsculas/)
    await expect(dialog.getByLabel('E-mail', { exact: true })).toHaveAccessibleDescription('Informe seu e-mail.')
  })
})

test.describe('carregamento, falha e recuperação', () => {
  test('rede lenta mostra skeletons no catálogo, detalhe e resumo do carrinho', async ({ page }) => {
    await open(page, '/')
    await scenario(page, 'slow')

    await page.reload()
    await expect(page.getByRole('list', { name: 'Carregando NFTs' })).toBeVisible()
    await expect(page.locator('#catalogo').getByRole('article').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('list', { name: 'Carregando NFTs' })).toHaveCount(0)

    await page.goto('/nft/nft-002')
    await expect(page.getByLabel('Carregando NFT')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible({ timeout: 10_000 })

    await page.goto('/carrinho')
    await expect(page.getByLabel('Carregando carrinho')).toBeVisible()
  })

  test('falha HTTP 500 mostra feedback e "Tentar novamente" recupera', async ({ page }) => {
    await open(page, '/')
    await scenario(page, 'server-error')
    await page.reload()
    // Transient 5xx are retried twice by Query before the error is shown.
    await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Erro inesperado no servidor.')).toBeVisible()

    await scenario(page, 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('#catalogo').getByRole('article').first()).toBeVisible()
    await expect(page.getByText('Não foi possível carregar o catálogo.')).toHaveCount(0)
  })

  test('falha transitória (503) é recuperada sozinha pelo retry automático', async ({ page }) => {
    await open(page, '/')
    await scenario(page, 'flaky')
    await page.goto('/nft/nft-004')
    // First request fails with 503, the automatic retry succeeds: no error is shown.
    await expect(page.getByRole('heading', { level: 1, name: 'Cosmic Bloom #118' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar' })).toHaveCount(0)
  })

  test('sem conexão mostra mensagem de rede e não aparenta sucesso', async ({ page }) => {
    await open(page, '/')
    await scenario(page, 'offline')
    await page.goto('/nft/nft-005')
    await expect(page.getByText('Sem conexão com o servidor. Verifique sua internet.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })
})
