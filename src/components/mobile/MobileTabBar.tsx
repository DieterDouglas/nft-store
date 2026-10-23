import { Link, useLocation } from '@tanstack/react-router'
import { Heart, House, ShoppingCart, UserRound } from 'lucide-react'
import searchIcon from '@/assets/mobile-icon-home-footer.svg'
import { SearchDialog } from '@/components/shared/SearchDialog'
import { useCart } from '@/features/cart/hooks'
import { cn } from '@/lib/utils'

const item = 'grid size-12 place-items-center rounded-full transition-colors'

/** Bottom navigation of the mobile frames; the raised center button opens search. */
export function MobileTabBar() {
  const { pathname } = useLocation()
  const count = useCart().data?.itemCount ?? 0
  const tone = (active: boolean) => (active ? 'text-primary' : 'text-foreground/70 hover:text-primary')

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="relative mx-auto flex h-20 max-w-md items-center justify-between rounded-t-[2rem] bg-card px-6 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.35)]">
        <Link to="/" aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={cn(item, tone(pathname === '/'))}>
          <House className="size-6" fill={pathname === '/' ? 'currentColor' : 'none'} />
        </Link>
        <Link to="/favoritos" aria-label="Lista de interesse" aria-current={pathname === '/favoritos' ? 'page' : undefined} className={cn(item, tone(pathname === '/favoritos'))}>
          <Heart className="size-6" fill={pathname === '/favoritos' ? 'currentColor' : 'none'} />
        </Link>
        {/* Transparent search button with the Figma icon (decorative img; the button carries the name). */}
        <SearchDialog
          trigger={
            <button
              type="button"
              aria-label="Buscar NFTs"
              className="grid size-14 place-items-center rounded-full bg-transparent transition-transform hover:bg-muted/40 active:scale-95"
            >
              <img src={searchIcon} alt="" width={27} height={24} className="size-7" />
            </button>
          }
        />
        <Link
          to="/carrinho"
          aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          aria-current={pathname === '/carrinho' ? 'page' : undefined}
          className={cn(item, 'relative', tone(pathname === '/carrinho'))}
        >
          <ShoppingCart className="size-6" />
          {count > 0 && (
            <span aria-hidden className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
        <Link
          to="/perfil"
          aria-label="Meu perfil"
          aria-current={['/perfil', '/carteiras'].includes(pathname) ? 'page' : undefined}
          className={cn(item, tone(['/perfil', '/carteiras'].includes(pathname)))}
        >
          <UserRound className="size-6" fill={['/perfil', '/carteiras'].includes(pathname) ? 'currentColor' : 'none'} />
        </Link>
      </div>
    </nav>
  )
}
