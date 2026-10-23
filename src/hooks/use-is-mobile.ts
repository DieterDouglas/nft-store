import { useSyncExternalStore } from 'react'

/** Below Tailwind's `md` breakpoint the app switches to the mobile (app-like) layouts. */
const QUERY = '(max-width: 767.98px)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * Pages whose mobile and desktop layouts differ structurally render only one of them
 * (no duplicated ids, headings or radio groups hidden by CSS).
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}
