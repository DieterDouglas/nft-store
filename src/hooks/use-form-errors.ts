import { useState } from 'react'
import type { z } from 'zod'
import { toApiError } from '@/api/client'

/**
 * Field errors from client-side zod validation and from API 422/409 responses,
 * merged into one map keyed by field name.
 */
export function useFormErrors<T extends object>() {
  const [errors, setErrors] = useState<Partial<Record<keyof T | 'form', string>>>({})

  return {
    errors,
    clear: () => setErrors({}),
    /** Returns parsed data, or null after recording the errors. */
    validate<S extends z.ZodType>(schema: S, values: unknown): z.infer<S> | null {
      const result = schema.safeParse(values)
      if (result.success) {
        setErrors({})
        return result.data
      }
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        next[key] ??= issue.message
      }
      setErrors(next as typeof errors)
      return null
    },
    fromApi(error: unknown) {
      const apiError = toApiError(error)
      setErrors(Object.keys(apiError.fields).length ? (apiError.fields as typeof errors) : ({ form: apiError.message } as typeof errors))
    },
  }
}

export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}
