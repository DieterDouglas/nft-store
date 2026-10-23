import type { ReactNode } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export const circleButton = 'grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card/80 text-primary transition-colors hover:bg-muted'

/** Mobile screen header: round back button, centered title and an optional action. */
export function MobileTopBar({ title, action, className }: { title?: string; action?: ReactNode; className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()

  return (
    <div className={cn('flex items-center gap-3 pt-6 pb-4', className)}>
      <button
        type="button"
        aria-label="Voltar"
        className={circleButton}
        onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
      >
        <ChevronLeft className="size-5" />
      </button>
      {/* Visual title; each page keeps its own (sr-only) <h1>. */}
      {title && (
        <p aria-hidden className="flex-1 truncate text-center font-display text-lg font-bold">
          {title}
        </p>
      )}
      {!title && <span className="flex-1" />}
      {action ?? <span className="size-11 shrink-0" aria-hidden />}
    </div>
  )
}
