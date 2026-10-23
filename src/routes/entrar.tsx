import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Legacy/direct URL: login is a modal now, opened over the home page. */
export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'entrar', redirect: search.redirect }, replace: true })
  },
})
