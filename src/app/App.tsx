import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { sessionStore } from '@/api/session-store'
import { createQueryClient } from './query-client'

const queryClient = createQueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Loaders delegate to Query, so the router never caches on its own.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Logout, expiry or user switch: private cache from the previous session must not survive.
sessionStore.onEnd(() => {
  void queryClient.cancelQueries({ queryKey: ['user'] })
  queryClient.removeQueries({ queryKey: ['user'] })
})

export function renderApp(element: HTMLElement) {
  createRoot(element).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return router
}
