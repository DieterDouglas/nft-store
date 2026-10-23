import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Legacy/direct URL: sign-up is a modal now, opened over the home page. */
export const Route = createFileRoute('/cadastro')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'cadastro', redirect: search.redirect }, replace: true })
  },
})
