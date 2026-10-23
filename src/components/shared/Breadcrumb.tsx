import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'

type Crumb = { label: string; to?: '/' | '/carrinho'; hash?: string }

/** "Início / Mercado / …" trail from the layout; the last crumb is the current page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="py-4 text-sm font-bold">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={item.label}>
              <li>
                {last || !item.to ? (
                  <span aria-current={last ? 'page' : undefined}>{item.label}</span>
                ) : (
                  <Link to={item.to} hash={item.hash} className="hover:text-primary">
                    {item.label}
                  </Link>
                )}
              </li>
              {!last && (
                <li aria-hidden className="text-muted-foreground">
                  /
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export const MARKET_TRAIL: Crumb[] = [
  { label: 'Início', to: '/' },
  { label: 'Mercado', to: '/', hash: 'catalogo' },
]
