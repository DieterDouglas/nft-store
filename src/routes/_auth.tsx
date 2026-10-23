import { useEffect, useRef } from 'react'
import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { sessionStore } from '@/api/session-store'
import { useSession } from '@/hooks/use-session'

/**
 * Pathless layout guarding checkout, orders, profile and wallets. Without a session the
 * page can't render behind the login modal, so the modal opens over the home page and
 * continues to the requested URL after authenticating.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.get()) throw redirect({ to: '/', search: { auth: 'entrar', redirect: location.href } })
  },
  component: PrivateLayout,
})

function PrivateLayout() {
  const session = useSession()
  const navigate = useNavigate()
  const { href } = useLocation()
  // Last private URL seen *with* a session. While the redirect below is in flight, the
  // location already points at the destination; reading it then would nest redirects.
  const lastPrivateHref = useRef(href)
  const redirected = useRef(false)

  useEffect(() => {
    if (session) lastPrivateHref.current = href
  }, [session, href])

  // Session expired while on a private page: log in again and come back here (drafts are kept).
  useEffect(() => {
    if (session || redirected.current) return
    redirected.current = true
    void navigate({ to: '/', search: { auth: 'entrar', redirect: lastPrivateHref.current, motivo: 'expirada' }, replace: true })
  }, [session, navigate])

  return session ? <Outlet /> : null
}
