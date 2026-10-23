import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SLIDES = [
  { image: '/nfts/emerald.webp', alt: 'Emerald Ape #042: macaco de óculos redondos e jaqueta college verde', nftId: 'nft-001' },
  { image: '/nfts/ivory.webp', alt: 'Neon Vessel #552: macaco de cabelo preto, gola alta verde e blazer bege', nftId: 'nft-003' },
  { image: '/nfts/golden.webp', alt: 'Golden Beat #207: macaco dourado com fones de ouvido verdes', nftId: 'nft-007' },
]

export function Hero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="grid items-center gap-8 pt-6 md:grid-cols-[1fr_minmax(0,460px)] md:gap-12 md:pt-4">
      <div className="space-y-5 md:pl-12">
        <p className="text-sm tracking-wider">Bem-vindo à Kurio</p>
        <h1 className="font-display text-3xl leading-[1.6] font-bold tracking-wider uppercase sm:text-4xl lg:text-[44px]">
          Seja dono do futuro da arte digital
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <div className="flex items-center justify-between gap-6 pt-2 md:max-w-lg">
          <Button asChild size="lg" className="font-bold">
            <Link to="/" hash="catalogo">
              EXPLORAR
            </Link>
          </Button>
          <div className="flex gap-2" role="group" aria-label="Escolher destaque">
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Destaque ${i + 1} de ${SLIDES.length}`}
                aria-pressed={i === index}
                className={cn('size-3 rounded-full transition-colors', i === index ? 'bg-primary' : 'bg-primary/40 hover:bg-primary/70')}
              />
            ))}
          </div>
        </div>
      </div>
      <Link to="/nft/$nftId" params={{ nftId: slide.nftId }} className="block overflow-hidden rounded-xl" aria-live="polite">
        <img
          src={slide.image}
          alt={slide.alt}
          width={600}
          height={600}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          className="aspect-square w-full object-cover"
        />
      </Link>
    </section>
  )
}
