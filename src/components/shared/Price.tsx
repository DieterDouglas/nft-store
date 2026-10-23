import type { Eth } from '@/api/types'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export function Price({ value, compareAt, className }: { value: Eth; compareAt?: Eth; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 font-bold text-primary', className)}>
      <span>{formatEth(value)}</span>
      {compareAt && (
        <s className="font-normal text-muted-foreground">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(compareAt)}
        </s>
      )}
    </p>
  )
}
