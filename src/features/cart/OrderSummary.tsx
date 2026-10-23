import type { ReactNode } from 'react'
import type { Quote } from '@/api/types'
import { formatEth, isZero } from '@/lib/money'
import { NETWORK_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'

type Totals = Pick<Quote, 'subtotal' | 'discount' | 'networkFee' | 'total' | 'coupon' | 'network'>

/** Totals exactly as returned by the API quote / order receipt (never recomputed client-side). */
export function SummaryRows({ quote, estimated, stale }: { quote: Totals; estimated?: boolean; stale?: boolean }) {
  return (
    <dl aria-label="Resumo" className={cn('space-y-3 text-sm transition-opacity', stale && 'opacity-60')}>
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-base tabular-nums">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Desconto do lançamento{quote.coupon && ` (${quote.coupon.code} −${quote.coupon.percentOff}%)`}</dt>
        <dd className="tabular-nums">{isZero(quote.discount) ? '(-) 0.00' : `(-) ${formatEth(quote.discount)}`}</dd>
      </div>
      <div>
        <div className="flex justify-between gap-4">
          <dt>Taxa de rede{!estimated && ` (${NETWORK_LABEL[quote.network]})`}</dt>
          <dd className="text-base tabular-nums">{formatEth(quote.networkFee)}</dd>
        </div>
        {estimated && <p className="mt-1 text-right text-xs text-primary">Taxa estimada ({NETWORK_LABEL[quote.network]})</p>}
      </div>
      <div className="flex items-baseline justify-between gap-4 pt-3">
        <dt className="font-bold">Total</dt>
        <dd className="text-xl font-bold text-primary tabular-nums">{formatEth(quote.total)}</dd>
      </div>
    </dl>
  )
}

export function OrderSummary({
  quote,
  intro,
  children,
  stale,
  estimated,
  title = 'Resumo',
  className,
}: {
  quote: Totals
  /** Rendered between the title and the totals (coupon form in the cart). */
  intro?: ReactNode
  children?: ReactNode
  stale?: boolean
  estimated?: boolean
  title?: string
  className?: string
}) {
  return (
    <section aria-labelledby="resumo-titulo" className={cn('space-y-5', className)}>
      <h2 id="resumo-titulo" className="border-b border-border pb-3 font-bold">
        {title}
      </h2>
      {intro}
      <SummaryRows quote={quote} estimated={estimated} stale={stale} />
      {children}
    </section>
  )
}

export function OrderSummarySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando resumo">
      <div className="shimmer h-6 w-40 rounded" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="shimmer h-4 w-28 rounded" />
          <div className="shimmer h-4 w-20 rounded" />
        </div>
      ))}
      <div className="shimmer h-7 w-full rounded" />
      <div className="shimmer h-11 w-full rounded-md" />
    </div>
  )
}
