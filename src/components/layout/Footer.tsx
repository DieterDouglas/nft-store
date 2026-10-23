import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from './SocialIcons'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const SOCIAL = [
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
  { label: 'X (Twitter)', href: 'https://x.com', Icon: XIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: YoutubeIcon },
]

const HELP = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']

function Soon({ children }: { children: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-muted-foreground">
      {children}
    </span>
  )
}

function Newsletter() {
  const [notice, setNotice] = useState('')
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold">Antecipe-se ao próximo lançamento</h2>
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault()
          // Out of scope: be explicit that nothing was subscribed.
          setNotice('As inscrições na newsletter abrem em breve. Nenhum dado foi enviado.')
        }}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para a newsletter
        </label>
        <Input id="newsletter-email" type="email" placeholder="digite seu e-mail..." className="rounded-r-none bg-secondary" />
        <Button type="submit" className="rounded-l-none">
          Enviar
        </Button>
      </form>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {notice || 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('mx-auto mt-24 w-full max-w-[1200px] px-4 pb-6 text-sm', className)}>
      <div className="grid gap-8 rounded-t-lg bg-card p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
        {FEATURES.map((f) => (
          <div key={f.title} className="space-y-3 lg:border-r lg:border-primary/40 lg:pr-6">
            <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
              {f.letter}
            </span>
            <h2 className="font-bold">{f.title}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{f.text}</p>
          </div>
        ))}
        <Newsletter />
      </div>

      <div className="grid gap-4 bg-secondary px-6 py-6 text-xs sm:grid-cols-4 sm:items-center lg:px-8">
        <span className="font-display font-bold tracking-widest">KURIO</span>
        <span>Feito para colecionadores, criadores e cultura</span>
        <a href="mailto:contato@email.com" className="hover:text-primary">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-primary">
          +55 11 4002 8922
        </a>
      </div>

      <div className="grid gap-8 rounded-b-lg bg-card p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
        <nav aria-label="Minha conta" className="space-y-3">
          <h2 className="font-bold">Meu perfil</h2>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/perfil" className="hover:text-primary">
                Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/carteiras" className="hover:text-primary">
                Minhas carteiras
              </Link>
            </li>
            <li>
              <Link to="/favoritos" className="hover:text-primary">
                Lista de interesse
              </Link>
            </li>
            <li>
              <Soon>Atividade</Soon>
            </li>
            <li>
              <Soon>Estúdio do criador</Soon>
            </li>
          </ul>
        </nav>
        <nav aria-label="Ajuda" className="space-y-3">
          <h2 className="font-bold">Central de ajuda</h2>
          <ul className="space-y-2 text-xs">
            {HELP.map((h) => (
              <li key={h}>
                <Soon>{h}</Soon>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Coleções" className="space-y-3">
          <h2 className="font-bold">Coleções</h2>
          <ul className="space-y-2 text-xs">
            {(['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade'] as const).map((c) => (
              <li key={c}>
                <Link to="/" search={{ category: [c] }} hash="catalogo" className="hover:text-primary">
                  {CATEGORY_LABEL[c]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-bold">Redes sociais</h2>
            <ul className="flex gap-2">
              {SOCIAL.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="grid size-8 place-items-center rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="font-bold">Carteiras compatíveis</h2>
            <p className="inline-block rounded bg-secondary px-3 py-1 text-[10px] tracking-wider text-primary">METAMASK · WALLETCONNECT · COINBASE</p>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
