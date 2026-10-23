import { useEffect, useRef, useState } from 'react'
import type { NftListParams } from '@/api/types'
import { cn } from '@/lib/utils'
import { useNftList } from './hooks'
import { NftCard, NftCardSkeleton } from './NftCard'

/**
 * Horizontal shelf ("Mais desta coleção", "Colecionadores também viram").
 * Native scroll-snap: works with touch, trackpad and keyboard; dots jump a viewport at a time.
 */
export function NftCarousel({ title, params, excludeIds = [] }: { title: string; params: NftListParams; excludeIds?: string[] }) {
  const list = useNftList({ ...params, page: 1, pageSize: 16 })
  const items = (list.data?.items ?? []).filter((n) => !excludeIds.includes(n.id)).slice(0, 15)
  const trackRef = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)
  const headingId = `shelf-${title.replace(/\W+/g, '-').toLowerCase()}`

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      setPages(Math.max(1, Math.round(track.scrollWidth / track.clientWidth)))
      setPage(Math.round(track.scrollLeft / track.clientWidth))
    }
    measure()
    track.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      track.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [items.length])

  if (list.isError || (list.data && items.length === 0)) return null

  return (
    <section aria-labelledby={headingId} className="mt-20">
      <h2 id={headingId} className="border-b border-border pb-3 font-bold text-primary">
        {title}
      </h2>
      <ul
        ref={trackRef}
        className="mt-6 grid snap-x snap-mandatory auto-cols-[calc((100%-1rem)/2)] grid-flow-col gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] md:auto-cols-[calc((100%-2*1.5rem)/3)] md:gap-6 lg:auto-cols-[calc((100%-4*1.5rem)/5)]"
      >
        {list.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="snap-start">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="snap-start">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
      {pages > 1 && (
        <div className="mt-6 flex justify-center gap-2" role="group" aria-label={`Páginas de ${title}`}>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Página ${i + 1} de ${pages}`}
              aria-pressed={i === page}
              onClick={() => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth })}
              className={cn('size-3 rounded-full border border-primary transition-colors', i === page ? 'bg-primary' : 'hover:bg-primary/40')}
            />
          ))}
        </div>
      )}
    </section>
  )
}
