import type { ReactNode } from 'react'
import { AlertTriangle, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/api/client'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description?: ReactNode
  action?: ReactNode
  tone?: 'empty' | 'error'
  className?: string
}

export function StateMessage({ title, description, action, tone = 'empty', className }: Props) {
  const Icon = tone === 'error' ? AlertTriangle : SearchX
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-12 text-center', className)}
    >
      <Icon aria-hidden className={cn('size-8', tone === 'error' ? 'text-destructive' : 'text-primary')} />
      <h2 className="font-bold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function QueryError({ error, onRetry, title = 'Não foi possível carregar.' }: { error: unknown; onRetry: () => void; title?: string }) {
  return (
    <StateMessage
      tone="error"
      title={title}
      description={toApiError(error).message}
      action={
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      }
    />
  )
}
