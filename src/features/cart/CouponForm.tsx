import { useState } from 'react'
import { Ticket, X } from 'lucide-react'
import { toApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from './hooks'

/** default: labelled field + square button (desktop) · pill: rounded input with inset button (mobile). */
export function CouponForm({ applied, variant = 'default' }: { applied: string | null; variant?: 'default' | 'pill' }) {
  const [code, setCode] = useState('')
  const [emptyError, setEmptyError] = useState(false)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const apiError = apply.error ? toApiError(apply.error) : null
  const error = emptyError ? 'Informe um código promocional.' : apiError ? (apiError.fields.code ?? apiError.message) : undefined
  const pill = variant === 'pill'

  if (applied) {
    return (
      <div className={cn('flex items-center justify-between border border-success/50 p-3 text-sm', pill ? 'rounded-full px-5' : 'rounded-md')}>
        <span className="flex items-center gap-2">
          <Ticket aria-hidden className="size-4 text-success" /> Cupom <strong>{applied}</strong> aplicado
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={`Remover cupom ${applied}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
          <X />
        </Button>
      </div>
    )
  }
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return setEmptyError(true)
        apply.mutate(code.trim(), { onSuccess: () => setCode('') })
      }}
      className="space-y-2"
    >
      <label htmlFor="coupon" className={cn('text-sm font-bold', pill && 'sr-only')}>
        Código promocional
      </label>
      <div className={cn('flex', pill && 'relative')}>
        <Input
          id="coupon"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setEmptyError(false)
            apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoCapitalize="characters"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className={pill ? 'h-14 rounded-full border-border pr-28 pl-5 text-sm placeholder:text-xs' : 'h-11 rounded-r-none border-primary text-xs'}
        />
        <Button
          type="submit"
          disabled={apply.isPending}
          className={
            pill
              ? 'absolute inset-y-0 right-0 h-14 rounded-full bg-linear-to-r from-primary to-[#b8733d] px-6 text-base font-bold'
              : 'h-11 rounded-l-none px-5 font-bold'
          }
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
