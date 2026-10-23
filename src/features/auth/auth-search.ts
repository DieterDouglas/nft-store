import { z } from 'zod'

/**
 * Login/register live in a modal driven by the URL (?auth=entrar|cadastro), so it opens
 * over any page, survives refresh, closes with the back button and can be linked directly.
 * Declared on the root route; every route inherits these optional params.
 */
export const authSearchSchema = z.object({
  auth: z.enum(['entrar', 'cadastro']).optional().catch(undefined),
  /** Same-origin path to continue to after authenticating (protected pages). */
  redirect: z.string().optional().catch(undefined),
  motivo: z.enum(['expirada']).optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>

/** Removes the modal params, keeping everything else (filters, pagination…). */
export function withoutAuth<T extends Record<string, unknown>>(search: T) {
  const { auth: _a, redirect: _r, motivo: _m, ...rest } = search
  return rest
}

/** Only same-origin paths are accepted as post-login destinations (no open redirects). */
export function safeRedirect(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
}
