import { HttpResponse } from 'msw'
import { NETWORKS, WALLET_PROVIDERS, type UpsertWalletRequest, type Wallet, type WalletConnection, type WalletRole } from '@/api/types'
import { commit, db, nextId } from '../db'
import { apiError, readJson, route, validationError } from '../http'
import { getScenario } from '../scenarios'
import { ENS } from './account'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

const walletsOf = (userId: string) => (db().wallets[userId] ??= [])

export const walletHandlers = [
  route('get', '/wallets', 'wallets', ({ user }) => HttpResponse.json(walletsOf(user!.id)), { auth: 'required' }),

  /** Creates or replaces the wallet in a slot (primary/secondary). */
  route<{ role: string }>(
    'put',
    '/wallets/:role',
    'wallets',
    async ({ request, user, params }) => {
      if (params.role !== 'primary' && params.role !== 'secondary') return apiError(404, 'NOT_FOUND', 'Tipo de carteira inexistente.')
      const role = params.role as WalletRole
      const body = await readJson<UpsertWalletRequest>(request)
      const fields: Record<string, string> = {}
      if (!body.label || body.label.trim().length < 2) fields.label = 'Dê um nome à carteira.'
      if (!body.provider || !WALLET_PROVIDERS.includes(body.provider)) fields.provider = 'Escolha um provedor.'
      if (!body.network || !NETWORKS.includes(body.network)) fields.network = 'Escolha uma rede.'
      const address = body.address?.trim() ?? ''
      if (!fields.network) {
        const ok = body.network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
        if (!ok) fields.address = body.network === 'solana' ? 'Endereço Solana inválido.' : 'Endereço deve ter o formato 0x + 40 caracteres hexadecimais.'
      }
      const list = walletsOf(user!.id)
      if (!fields.address && list.some((w) => w.role !== role && w.address.toLowerCase() === address.toLowerCase())) {
        fields.address = 'Este endereço já está cadastrado na outra carteira.'
      }
      if (!body.displayName || body.displayName.trim().length < 2) fields.displayName = 'Informe o nome de exibição.'
      if (!body.profileName || body.profileName.trim().length < 2) fields.profileName = 'Informe o nome do perfil.'
      if (!body.email || !EMAIL.test(body.email.trim())) fields.email = 'Informe um e-mail válido.'
      const ensName = body.ensName?.trim().toLowerCase() || null
      if (ensName && !ENS.test(ensName)) fields.ensName = 'Use letras minúsculas, números ou hífen (mín. 3).'
      const altAddress = body.altAddress?.trim() || null
      if (altAddress && !EVM_ADDRESS.test(altAddress) && !/^[a-z0-9-]{3,63}\.eth$/.test(altAddress) && !SOLANA_ADDRESS.test(altAddress)) {
        fields.altAddress = 'Informe um endereço válido ou um nome .eth.'
      }
      const referralCode = body.referralCode?.trim().toUpperCase() || null
      if (referralCode && !/^[A-Z0-9]{4,12}$/.test(referralCode)) fields.referralCode = 'Código de indicação inválido (4 a 12 letras ou números).'
      if (role === 'secondary' && !list.some((w) => w.role === 'primary')) {
        return apiError(409, 'VALIDATION_ERROR', 'Cadastre a carteira principal antes da secundária.')
      }
      if (Object.keys(fields).length) return validationError(fields)

      const existing = list.find((w) => w.role === role)
      const wallet: Wallet = {
        id: existing?.id ?? nextId('wal'),
        role,
        label: body.label!.trim(),
        provider: body.provider!,
        address,
        network: body.network!,
        displayName: body.displayName!.trim(),
        profileName: body.profileName!.trim(),
        email: body.email!.trim().toLowerCase(),
        ensName,
        altAddress,
        referralCode,
        updatedAt: new Date().toISOString(),
      }
      db().wallets[user!.id] = [...list.filter((w) => w.role !== role), wallet].sort((a, b) => a.role.localeCompare(b.role))
      commit()
      return HttpResponse.json(wallet, { status: existing ? 200 : 201 })
    },
    { auth: 'required' },
  ),

  /** Simulated wallet extension handshake: approve or user-rejected (scenario). */
  route<{ id: string }>(
    'post',
    '/wallets/:id/connect',
    'wallets',
    async ({ request, user, params }) => {
      const wallet = walletsOf(user!.id).find((w) => w.id === params.id)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      const { network } = await readJson<{ network: Wallet['network'] }>(request)
      if (getScenario() === 'wallet-rejected') return apiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
      const body: WalletConnection = { walletId: wallet.id, status: 'connected', network: network ?? wallet.network, connectedAt: new Date().toISOString() }
      return HttpResponse.json(body)
    },
    { auth: 'required' },
  ),
]
