import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import heroBackground from '@/assets/HeadHomeBGMobile.png'
import heroComposition from '@/assets/Group 105.png'

type Slide =
  /** Figma export: main artwork with the inset already composed. */
  | { kind: 'composed'; src: string; alt: string }
  /** Same composition built from two catalog images. */
  | { kind: 'pair'; main: string; inset: string; alt: string }

const SLIDES: Slide[] = [
  { kind: 'composed', src: heroComposition, alt: 'Emerald Ape #042 e Sage Nomad #009' },
  { kind: 'pair', main: '/nfts/ivory.webp', inset: '/nfts/golden.webp', alt: 'Neon Vessel #552 e Golden Beat #207' },
  { kind: 'pair', main: '/nfts/golden.webp', inset: '/nfts/emerald.webp', alt: 'Golden Signal #160 e Emerald Ape #042' },
]

/** Hero card of the mobile home frame (different copy and composition from desktop). */
export function MobileHero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      style={{ backgroundImage: `url("${heroBackground}")` }}
      className="relative mt-5 overflow-hidden rounded-[2rem] bg-card bg-cover bg-center p-5 pb-10"
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs">Bem-vindo à Kurio</p>
          <h1 className="font-display text-lg leading-snug font-bold uppercase">Seja dono da cultura digital</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <Link to="/" hash="catalogo" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            EXPLORAR <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="relative w-32 sm:w-36" aria-live="polite">
          {slide.kind === 'composed' ? (
            <img src={slide.src} alt={slide.alt} width={138} height={146} fetchPriority="high" className="h-auto w-full" />
          ) : (
            <>
              <img src={slide.main} alt={slide.alt} width={600} height={600} className="aspect-square w-full rounded-2xl object-cover" />
              <img src={slide.inset} alt="" width={600} height={600} className="absolute -bottom-3 left-3 aspect-square w-14 rounded-xl object-cover ring-2 ring-[#3a261b] sm:w-16" />
            </>
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" role="group" aria-label="Escolher destaque">
        {SLIDES.map((s, i) => (
          <button
            key={s.alt}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Destaque ${i + 1} de ${SLIDES.length}`}
            aria-pressed={i === index}
            className={cn('size-2.5 rounded-full', i === index ? 'bg-primary' : 'bg-primary/40')}
          />
        ))}
      </div>
    </section>
  )
}
