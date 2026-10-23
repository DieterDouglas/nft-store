import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PromoBanners() {
  const banners = [
    {
      image: '/nfts/emerald.webp',
      title: 'Lançamentos gênesis de edição limitada',
      text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
      search: { tab: 'new' as const },
    },
    {
      image: '/nfts/ivory.webp',
      title: 'Arte digital selecionada e muito mais',
      text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a era.',
      search: { category: ['arte-digital' as const] },
    },
  ]
  return (
    <section aria-label="Coleções em destaque" className="mt-24 grid gap-6 md:grid-cols-2">
      {banners.map((b) => (
        <article key={b.title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] overflow-hidden rounded-md bg-card">
          <img src={b.image} alt="" width={600} height={600} loading="lazy" className="aspect-square h-full w-full rounded-xl object-cover" />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right">
            <h2 className="text-sm font-bold sm:text-base">{b.title}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{b.text}</p>
            <Button asChild size="sm">
              <Link to="/" search={b.search} hash="catalogo">
                Explorar <ArrowRight />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  { image: '/nfts/ivory.webp', date: '12 de setembro', read: 6, title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '/nfts/emerald.webp', date: '13 de setembro', read: 2, title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: '/nfts/sage.webp', date: '15 de setembro', read: 3, title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: '/nfts/golden.webp', date: '15 de setembro', read: 2, title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function Journal() {
  return (
    <section aria-labelledby="diario" className="mt-24">
      <h2 id="diario" className="text-center font-display text-2xl font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-xs text-muted-foreground">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((p) => (
          <li key={p.title}>
            <article className="h-full overflow-hidden rounded-md bg-card">
              <img src={p.image} alt="" width={600} height={600} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="text-[11px] text-muted-foreground">
                  {p.date} | Leitura de {p.read} min
                </p>
                <h3 className="text-sm font-bold">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.text}</p>
                {/* Editorial pages are out of scope: shown as unavailable, not as a working link. */}
                <p aria-disabled="true" className="text-xs text-primary/70">
                  Ler mais → <span className="text-muted-foreground">(em breve)</span>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
