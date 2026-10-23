import { HttpResponse } from 'msw'
import type { ChangePasswordRequest, LoginRequest, RegisterRequest, Session, UpdateProfileRequest } from '@/api/types'
import { commit, db, hashPassword, nextId, publicUser, SESSION_TTL_MS, type MockUser } from '../db'
import { apiError, readJson, route, validationError } from '../http'
import { dropUserConnections } from '../realtime'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME = /^[a-z0-9._]{3,30}$/
export const ENS = /^[a-z0-9-]{3,63}$/

function passwordProblem(password: string | undefined) {
  if (!password || password.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.'
  return null
}

function openSession(user: MockUser): Session {
  const s = db()
  const session = {
    token: `tok-${nextId('s')}-${crypto.randomUUID()}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  s.sessions.push(session)
  commit()
  return { token: session.token, expiresAt: session.expiresAt, user: publicUser(user) }
}

export const accountHandlers = [
  route('post', '/auth/register', 'account', async ({ request }) => {
    const body = await readJson<RegisterRequest>(request)
    const fields: Record<string, string> = {}
    const username = body.username?.trim().toLowerCase() ?? ''
    if (!USERNAME.test(username)) fields.username = 'Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado.'
    if (!body.email || !EMAIL.test(body.email)) fields.email = 'Informe um e-mail válido.'
    const pw = passwordProblem(body.password)
    if (pw) fields.password = pw
    if (Object.keys(fields).length) return validationError(fields)

    const s = db()
    const email = body.email!.trim().toLowerCase()
    if (s.users.some((u) => u.email === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
    }
    if (s.users.some((u) => u.username === username)) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    const id = nextId('usr')
    const salt = `salt-${id}`
    const user: MockUser = {
      id,
      // Display name starts as the username; editable later in "Perfil do colecionador".
      name: username,
      username,
      email,
      ensName: null,
      walletNickname: `Carteira de ${username}`,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(body.password!, salt),
    }
    s.users.push(user)
    return HttpResponse.json(openSession(user), { status: 201 })
  }),

  route('post', '/auth/login', 'account', async ({ request }) => {
    const body = await readJson<LoginRequest>(request)
    const fields: Record<string, string> = {}
    if (!body.email) fields.email = 'Informe seu e-mail.'
    if (!body.password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) return validationError(fields)
    const user = db().users.find((u) => u.email === body.email!.trim().toLowerCase())
    if (!user || (await hashPassword(body.password!, user.salt)) !== user.passwordHash) {
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(openSession(user))
  }),

  route(
    'get',
    '/auth/session',
    'account',
    ({ user, token }) => {
      const session = db().sessions.find((s) => s.token === token)!
      return HttpResponse.json<Session>({ token: token!, expiresAt: session.expiresAt, user: publicUser(user!) })
    },
    { auth: 'required' },
  ),

  route(
    'post',
    '/auth/logout',
    'account',
    ({ user, token }) => {
      const s = db()
      s.sessions = s.sessions.filter((x) => x.token !== token)
      commit()
      dropUserConnections(user!.id)
      return new HttpResponse(null, { status: 204 })
    },
    { auth: 'required' },
  ),

  route('get', '/me', 'account', ({ user }) => HttpResponse.json(publicUser(user!)), { auth: 'required' }),

  route(
    'put',
    '/me',
    'account',
    async ({ request, user }) => {
      const body = await readJson<UpdateProfileRequest>(request)
      const fields: Record<string, string> = {}
      const others = db().users.filter((u) => u.id !== user!.id)
      if (!body.name || body.name.trim().length < 2) fields.name = 'Informe seu nome de exibição.'
      const username = body.username?.trim().toLowerCase() ?? ''
      if (!USERNAME.test(username)) fields.username = 'Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado.'
      else if (others.some((u) => u.username === username)) fields.username = 'Este nome de usuário já está em uso.'
      const email = body.email?.trim().toLowerCase()
      if (!email || !EMAIL.test(email)) fields.email = 'Informe um e-mail válido.'
      else if (others.some((u) => u.email === email)) fields.email = 'Este e-mail já está em uso.'
      const ensName = body.ensName?.trim().toLowerCase() || null
      if (ensName && !ENS.test(ensName)) fields.ensName = 'Use letras minúsculas, números ou hífen (mín. 3).'
      if (!body.walletNickname || body.walletNickname.trim().length < 2) fields.walletNickname = 'Dê um apelido à sua carteira.'
      if (Object.keys(fields).length) return validationError(fields)
      Object.assign(user!, { name: body.name!.trim(), username, email, ensName, walletNickname: body.walletNickname!.trim() })
      commit()
      return HttpResponse.json(publicUser(user!))
    },
    { auth: 'required' },
  ),

  route(
    'put',
    '/me/avatar',
    'account',
    async ({ request, user }) => {
      const body = await readJson<{ dataUrl: string | null }>(request)
      if (body.dataUrl !== null) {
        if (typeof body.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(body.dataUrl)) {
          return validationError({ avatar: 'Envie uma imagem PNG, JPG ou WebP.' })
        }
        // ~300 KB of base64 keeps the mock DB inside localStorage limits.
        if (body.dataUrl.length > 400_000) return validationError({ avatar: 'A imagem deve ter até 300 KB.' })
      }
      user!.avatarUrl = body.dataUrl ?? null
      commit()
      return HttpResponse.json(publicUser(user!))
    },
    { auth: 'required' },
  ),

  route(
    'put',
    '/me/password',
    'account',
    async ({ request, user, token }) => {
      const body = await readJson<ChangePasswordRequest>(request)
      if (!body.currentPassword || (await hashPassword(body.currentPassword, user!.salt)) !== user!.passwordHash) {
        return validationError({ currentPassword: 'Senha atual incorreta.' })
      }
      const pw = passwordProblem(body.newPassword)
      if (pw) return validationError({ newPassword: pw })
      if (body.newPassword === body.currentPassword) return validationError({ newPassword: 'A nova senha deve ser diferente da atual.' })
      user!.passwordHash = await hashPassword(body.newPassword!, user!.salt)
      // Other sessions of this user are revoked; the current one stays valid.
      const s = db()
      s.sessions = s.sessions.filter((x) => x.userId !== user!.id || x.token === token)
      commit()
      return new HttpResponse(null, { status: 204 })
    },
    { auth: 'required' },
  ),
]
