import { addFromDetail, expect, expectCartCount, isMobile, login, open, test, USERS } from './fixtures'

test('carrinho do visitante persiste após refresh e é preservado ao entrar', async ({ page }) => {
  await open(page, '/')
  await addFromDetail(page, 'nft-007') // Golden Beat
  await addFromDetail(page, 'nft-002', { quantity: 2 }) // Sage Nomad ×2

  await page.reload()
  await expect(page.getByRole('group', { name: 'Quantidade de Sage Nomad #009' }).locator('output')).toHaveText('2')
  await expect(page.getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()

  // Signing in merges the visitor cart into the account cart.
  await login(page, 'bruno', '/carrinho')
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quantidade de Sage Nomad #009' }).locator('output')).toHaveText('2')
  await expectCartCount(page, 3)
})

test('alterar quantidade e remover itens atualizam o resumo da API', async ({ page }) => {
  await open(page, '/')
  await addFromDetail(page, 'nft-009') // Golden Signal 0.39
  const summary = page.getByLabel('Resumo')
  await expect(summary.getByText('0.3948 ETH', { exact: true })).toBeVisible()

  await page.getByRole('group', { name: 'Quantidade de Golden Signal #160' }).getByRole('button', { name: 'Aumentar quantidade' }).click()
  // 2 × 0.39 + fee (0.0048 + 0.0007)
  await expect(summary.getByText('0.7855 ETH', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Remover Golden Signal #160 do carrinho' }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('logout limpa os dados privados e bloqueia páginas da conta', async ({ page }) => {
  await login(page, 'ana', '/perfil')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)

  if (isMobile(page)) {
    await page.getByRole('button', { name: 'Sair' }).click()
  } else {
    await page.getByRole('button', { name: `Conta de ${USERS.ana.name}` }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  }
  await expect(page).toHaveURL(/\/$/)
  // Wait for the signed-out UI (logout request finished) before navigating again.
  if (isMobile(page)) await expect(page.getByRole('link', { name: /^Entre para favoritar/ }).first()).toBeVisible()
  else await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
  await page.goto('/perfil')
  await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()
  // The previous user's profile is not reachable from cache.
  await expect(page.getByText(USERS.ana.email)).toHaveCount(0)
})

test('perfil: validação, erro da API, dados persistidos e avatar', async ({ page }) => {
  await login(page, 'ana', '/perfil')
  const username = page.getByLabel('Nome de usuário')

  // Client-side validation tied to the field.
  await username.fill('Nome Inválido!')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(username).toHaveAttribute('aria-invalid', 'true')
  await expect(username).toBeFocused()

  // API conflict (username of another account).
  await username.fill('brunocripto')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

  // Valid change persists after refresh.
  await username.fill('ana.nova')
  await page.getByLabel('Apelido da carteira').fill('Cofre principal')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana.nova')
  await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Cofre principal')

  // Avatar upload (a 1×1 PNG is resized client-side and stored by the API).
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await page.getByLabel('Escolher imagem de avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Avatar atualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
})

test('senha: atual incorreta, confirmação divergente e troca com sucesso', async ({ page }) => {
  await login(page, 'bruno', '/perfil')
  const current = page.getByLabel('Senha atual')
  const next = page.getByLabel('Nova senha', { exact: true })
  const confirm = page.getByLabel('Confirmar nova senha')
  const save = page.getByRole('button', { name: 'Salvar', exact: true })

  await current.fill(USERS.bruno.password)
  await next.fill('NovaSenha123')
  await confirm.fill('Diferente123')
  await save.click()
  await expect(page.getByText('As senhas não conferem.')).toBeVisible()

  await current.fill('errada123')
  await confirm.fill('NovaSenha123')
  await save.click()
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible()
  await expect(current).toHaveAttribute('aria-invalid', 'true')

  await current.fill(USERS.bruno.password)
  await save.click()
  await expect(page.getByText(/Perfil e senha atualizados/)).toBeVisible()
})

test('carteiras: validação de endereço, cadastro e persistência', async ({ page }) => {
  // Bruno has no wallets: primary first, then the secondary slot unlocks.
  await login(page, 'bruno', '/carteiras')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  const form = page.getByRole('form', { name: 'Dados da carteira principal' })

  await form.getByLabel('Nome de exibição').fill('Bruno Cripto')
  await form.getByLabel('Apelido da carteira').fill('Ledger')
  await form.getByLabel('Rede').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await form.getByLabel('Nome do perfil').fill('brunocripto')
  await form.getByLabel('Endereço da carteira').fill('0x123')
  await form.getByLabel('Tipo de carteira').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await form.getByLabel('E-mail').fill(USERS.bruno.email)
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(form.getByText('Endereço deve ter o formato 0x + 40 caracteres hexadecimais.')).toBeVisible()

  await form.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal salva.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('form', { name: 'Dados da carteira principal' }).getByLabel('Apelido da carteira')).toHaveValue('Ledger')
})
