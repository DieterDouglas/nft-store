import { lazy, Suspense, useEffect } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api } from '@/api/endpoints'
import { sessionStore } from '@/api/session-store'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileTabBar } from '@/components/mobile/MobileTabBar'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'
import { StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useSession } from '@/hooks/use-session'
import { RealtimeBridge } from '@/realtime/RealtimeBridge'
import { RealtimeAnnouncer } from '@/realtime/RealtimeAnnouncer'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { authSearchSchema } from '@/features/auth/auth-search'

const MockPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/MockPanel')) : null

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: authSearchSchema,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => (
    <StateMessage
      tone="error"
      title="Algo deu errado nesta página."
      description={error instanceof Error ? error.message : undefined}
      action={<Button onClick={reset}>Tentar novamente</Button>}
      className="mx-auto my-16 max-w-xl"
    />
  ),
})

/** Revalidates the stored session on load (refresh) and keeps the cached profile current. */
function SessionKeeper() {
  const session = useSession()
  const { data } = useQuery({
    queryKey: ['user', session?.user.id, 'session'],
    queryFn: ({ signal }) => api.auth.session({ signal }),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  })
  useEffect(() => {
    if (data) sessionStore.updateUser(data.user)
  }, [data])

  useEffect(
    () =>
      sessionStore.onEnd((reason) => {
        if (reason === 'expired') toast.warning('Sua sessão expirou. Entre novamente para continuar.')
      }),
    [],
  )
  return null
}

/** Mobile screens with their own fixed bottom action bar (no tab bar there). */
const OWN_BOTTOM_BAR = /^\/(nft\/|carrinho|checkout)/

function RootLayout() {
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const showTabBar = !OWN_BOTTOM_BAR.test(pathname)
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <RealtimeBridge />
      <SessionKeeper />
      <Header />
      <main id="conteudo" tabIndex={-1} className={cn('mx-auto w-full max-w-[1200px] px-4 outline-none', showTabBar && 'max-md:pb-28')}>
        <Outlet />
      </main>
      {/* Mobile frames are app-like: the footer only stays on the home page. */}
      <Footer className={pathname === '/' ? 'max-md:mb-24' : 'max-md:hidden'} />
      {showTabBar && <MobileTabBar />}
      <AuthDialog />
      <RealtimeAnnouncer />
      <Toaster position={isMobile ? 'top-center' : 'bottom-right'} closeButton />
      {MockPanel && (
        <Suspense>
          <MockPanel />
        </Suspense>
      )}
    </>
  )
}

function NotFound() {
  return (
    <StateMessage
      className="my-16"
      title="Página não encontrada"
      description="O endereço acessado não existe ou foi movido."
      action={
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      }
    />
  )
}
