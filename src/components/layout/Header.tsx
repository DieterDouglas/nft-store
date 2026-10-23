import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Search, ShoppingCart, User, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCart } from '@/features/cart/hooks'
import { logout } from '@/features/auth/session'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { SearchDialog } from '@/components/shared/SearchDialog'
import { UserAvatar } from '@/components/shared/UserAvatar'

const SOON = ['Criadores', 'Aprenda'] as const

function NavLinks() {
  const { pathname } = useLocation()
  const base = 'relative py-3 text-sm transition-colors hover:text-primary'
  const active = 'font-bold text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary'
  // Purchase flow pages belong to the market section, as in the layout.
  const inMarket = /^\/(nft|carrinho|checkout|pedidos)/.test(pathname)
  return (
    <ul className="flex items-center gap-10">
      <li>
        <Link
          to="/"
         
          className={cn(base, pathname === '/' && active)}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          Início
        </Link>
      </li>
      <li>
        <Link to="/" hash="catalogo" className={cn(base, inMarket && active)} aria-current={inMarket ? 'page' : undefined}>
          Mercado
        </Link>
      </li>
      {SOON.map((label) => (
        <li key={label}>
          {/* Out of scope for this delivery: visibly unavailable instead of a dead link. */}
          <span aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 py-3 text-sm text-muted-foreground">
            {label}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">em breve</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function CartLink() {
  const cart = useCart()
  const count = cart.data?.itemCount ?? 0
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
        <ShoppingCart className="size-5" />
        {count > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </Link>
    </Button>
  )
}

function AccountMenu() {
  const session = useSession()
  const navigate = useNavigate()
  if (!session) {
    return (
      <Button asChild size="sm" className="font-bold">
        <Link to="." search={(prev) => ({ ...prev, auth: 'entrar' as const })}>
          <LogIn />
          Entrar
        </Link>
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label={`Conta de ${session.user.name}`}>
          <UserAvatar user={session.user} className="size-7" />
          <span className="hidden max-w-32 truncate lg:inline">{session.user.name.split(' ')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{session.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <User /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">
            <Wallet /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favoritos">
            <Heart /> Lista de interesse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            // Leave private routes first so their guard doesn't bounce to the login page.
            await navigate({ to: '/' })
            await logout()
          }}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    // Mobile uses MobileTabBar + per-screen top bars instead (Figma mobile frames).
    <header className="mx-auto hidden w-full max-w-[1200px] px-4 md:block">
      <div className="flex h-16 items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-display text-sm font-bold tracking-widest" aria-label="Kurio, página inicial">
            KURIO
          </Link>
        </div>

        <nav aria-label="Principal">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
            <Search className="size-5" />
          </Button>
          <CartLink />
          <AccountMenu />
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
