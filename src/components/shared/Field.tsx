import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  /** Visual asterisk (hidden from AT) + aria-required on the control. */
  required?: boolean
  /** Placeholder-only designs (mobile auth): label stays for assistive tech, hidden visually. */
  hideLabel?: boolean
  error?: string
  hint?: string
  className?: string
  /** Receives the ids to wire into the control for label/error association. */
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined; 'aria-required'?: boolean }) => ReactNode
}

/** Label + control + hint/error, associated through id / aria-describedby / aria-invalid. */
export function Field({ label, required, hideLabel, error, hint, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id} className={cn('text-sm font-normal', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span aria-hidden className="-ml-1 text-primary">
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, ...(required && { 'aria-required': true }) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
