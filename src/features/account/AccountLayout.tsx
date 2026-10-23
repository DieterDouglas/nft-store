import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ChartSpline, Download, Heart, LogOut, MapPin, ShoppingCart, TriangleAlert, User } from 'lucide-react'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { logout } from '@/features/auth/session'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/perfil', label: 'Dados do perfil', Icon: User },
  { to: '/carteiras', label: 'Carteiras', Icon: MapPin },
  { label: 'Atividade', Icon: ShoppingCart },
  { to: '/favoritos', label: 'Lista de interesse', Icon: Heart },
  { label: 'Ofertas', Icon: ChartSpline },
  { label: 'Arquivos baixados', Icon: Download },
  { label: 'Suporte', Icon: TriangleAlert },
] as const

const item = 'flex items-center gap-3 border-l-4 px-4 py-3 text-sm whitespace-nowrap transition-colors'

/** "Meu perfil" sidebar shared by profile, wallets and wishlist (Figma account area). */
export function AccountLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <>
    {/* No mobile frame for the account area: reuse the app-like top bar of the other screens. */}
    <MobileTopBar title="Meu perfil" className="md:hidden" />
    <div className="grid gap-8 pt-6 max-md:pt-0 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0 self-start rounded-md bg-card py-3 lg:sticky lg:top-4">
        <h2 className="px-4 pb-2 text-lg font-bold">Meu perfil</h2>
        <nav aria-label="Minha conta">
          <ul className="flex overflow-x-auto lg:flex-col">
            {LINKS.map((link) => {
              const Icon = link.Icon
              if (!('to' in link)) {
                return (
                  <li key={link.label}>
                    <span aria-disabled="true" className={cn(item, 'cursor-not-allowed border-transparent text-primary/60')}>
                      <Icon aria-hidden className="size-4" />
                      {link.label}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">em breve</span>
                    </span>
                  </li>
                )
              }
              const active = pathname === link.to
              return (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(item, active ? 'border-primary bg-muted/40 text-primary' : 'border-transparent text-primary hover:bg-muted/40')}
                  >
                    <Icon aria-hidden className="size-4" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
            <li className="lg:mt-2 lg:border-t lg:border-primary/50">
              <button
                type="button"
                className={cn(item, 'w-full border-transparent font-bold text-primary hover:bg-muted/40')}
                onClick={async () => {
                  // Leave private routes first so their guard doesn't bounce to the login page.
                  await navigate({ to: '/' })
                  await logout()
                }}
              >
                <LogOut aria-hidden className="size-4" />
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
    </>
  )
}
