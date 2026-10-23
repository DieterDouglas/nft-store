import { z } from 'zod'
import { NETWORKS, WALLET_PROVIDERS } from '@/api/types'

// Mirrors the server rules so most errors are caught before the request.

const optional = (schema: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(schema.nullable())

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de ao menos 8 caracteres.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letras e números na senha.')

const email = z.string().trim().email('Informe um e-mail válido.')
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado.')
const ensName = optional(z.string().toLowerCase().regex(/^[a-z0-9-]{3,63}$/, 'Use letras minúsculas, números ou hífen (mín. 3).'))
const referralCode = optional(z.string().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, 'Código de indicação inválido (4 a 12 letras ou números).'))

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome de exibição.'),
  username,
  email,
  ensName,
  walletNickname: z.string().trim().min(2, 'Dê um apelido à sua carteira.'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })

const EVM = /^0x[a-fA-F0-9]{40}$/
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const walletSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
    label: z.string().trim().min(2, 'Dê um apelido à carteira.'),
    network: z.enum(NETWORKS, { message: 'Selecione uma rede.' }),
    profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
    address: z.string().trim(),
    altAddress: optional(z.string().refine((v) => EVM.test(v) || SOLANA.test(v) || /^[a-z0-9-]{3,63}\.eth$/.test(v), 'Informe um endereço válido ou um nome .eth.')),
    provider: z.enum(WALLET_PROVIDERS, { message: 'Selecione uma carteira.' }),
    referralCode,
    email,
    ensName,
  })
  .superRefine((v, ctx) => {
    const ok = v.network === 'solana' ? SOLANA.test(v.address) : EVM.test(v.address)
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: v.network === 'solana' ? 'Endereço Solana inválido.' : 'Endereço deve ter o formato 0x + 40 caracteres hexadecimais.',
      })
    }
  })

export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  email,
  ensName,
  referralCode,
  note: optional(z.string().max(500, 'A observação pode ter até 500 caracteres.')),
})
