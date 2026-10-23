import Decimal from 'decimal.js'
import type { Eth } from '@/api/types'

// ETH has 18 decimals; keep enough precision that no intermediate step rounds.
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export const eth = (value: Eth | number) => new D(value)

export const add = (...values: Eth[]): Eth => values.reduce((acc, v) => acc.plus(v), new D(0)).toFixed()

export const mul = (value: Eth, factor: Eth | number): Eth => new D(value).times(factor).toFixed()

export const sub = (a: Eth, b: Eth): Eth => new D(a).minus(b).toFixed()

/** Percent discount, rounded down to 6 decimals so the buyer is never overcharged by rounding. */
export const percentOf = (value: Eth, percent: number): Eth =>
  new D(value).times(percent).div(100).toDecimalPlaces(6, Decimal.ROUND_DOWN).toFixed()

export const compare = (a: Eth, b: Eth) => new D(a).comparedTo(b)

export const isZero = (value: Eth) => new D(value).isZero()

/** "1.190000" -> "1.19", "0.0042" -> "0.0042", "3" -> "3.00". */
export function formatEth(value: Eth, { withUnit = true } = {}): string {
  const d = new D(value)
  const fixed = d.decimalPlaces() <= 2 ? d.toFixed(2) : d.toFixed()
  return withUnit ? `${fixed} ETH` : fixed
}
