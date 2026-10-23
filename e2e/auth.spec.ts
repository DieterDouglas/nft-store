import { buyButton, expect, expectSignedIn, login, mock, open, openLoginFromPage, showBuyerFields, test, USERS } from './fixtures'

test('login abre como modal sobre a página atual e retorna a ela', async ({ page }) => {
  await open(page, '/nft/nft-003')
  await openLoginFromPage(page)
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible()
  // The page stays underneath: same route, modal in the URL.
  await expect(page).toHaveURL(/\/nft\/nft-003\?auth=entrar/)
  await expect(dialog.getByLabel('E-mail', { exact: true })).toBeFocused()

  // Client-side validation, then API error, both tied to the fields.
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByText('Informe seu e-mail.')).toBeVisible()
  await dialog.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('senha-errada1')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByText('E-mail ou senha incorretos.')).toBeVisible()

  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/nft\/nft-003$/)
  await expectSignedIn(page, USERS.ana.name)
})

test('Esc fecha o modal e devolve o foco ao botão que o abriu', async ({ page }) => {
  await open(page, '/nft/nft-002')
  const trigger = await openLoginFromPage(page)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/\/nft\/nft-002$/)
  await expect(trigger).toBeFocused()
})

test('página protegida sem sessão abre o login e continua para ela', async ({ page }) => {
  await open(page, '/perfil')
  await expect(page).toHaveURL(/\/\?auth=entrar&redirect=%2Fperfil/)
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await dialog.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
})

test('cadastro trata conflito de e-mail e cria a conta', async ({ page }) => {
  await open(page, '/?auth=cadastro')
  const dialog = page.getByRole('dialog', { name: 'Criar conta na Kurio' })
  await dialog.getByLabel('Nome de usuário').fill('carla.teste')
  await dialog.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Segura123')
  await dialog.getByLabel('Confirmar senha').fill('Segura123')
  await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()
  await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  await expect(dialog.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')

  await dialog.getByLabel('E-mail', { exact: true }).fill('carla@kurio.dev')
  await dialog.getByRole('button', { name: /^(Criar conta|Criar perfil)$/ }).click()
  await expect(dialog).toBeHidden()
  await expectSignedIn(page, 'carla.teste')
})

test('sessão expirada no checkout pede login e retoma o pagamento', async ({ page }) => {
  await login(page)
  await page.goto('/nft/nft-009')
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.goto('/checkout')
  await showBuyerFields(page)
  await page.getByLabel('Código de indicação (opcional)').fill('AMIGO2026')

  await mock(page, 'expire-sessions', {})
  // The next private request (this click, or a background refetch that wins the race) gets
  // SESSION_EXPIRED; either way the login modal opens and the draft survives the re-login.
  await page.getByRole('button', { name: 'Confirmar compra' }).click({ timeout: 3_000 }).catch(() => {})
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog.getByText('Sua sessão expirou')).toBeVisible()
  await dialog.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await showBuyerFields(page)
  await expect(page.getByLabel('Código de indicação (opcional)')).toHaveValue('AMIGO2026')
})

test('URL antiga /entrar abre o modal', async ({ page }) => {
  await open(page, '/entrar')
  await expect(page).toHaveURL(/\/\?auth=entrar/)
  await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()
})
