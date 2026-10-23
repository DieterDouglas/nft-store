import { Link } from '@tanstack/react-router'

export function FeaturedNft() {
  return (
    <Link to="/nft/$nftId" params={{ nftId: 'nft-002' }} className="group block rounded-md bg-card pt-4 transition-colors hover:bg-muted">
      <p className="px-4 font-display text-lg font-bold text-primary">NFT EM DESTAQUE</p>
      <p className="px-4 pb-3 text-center font-display font-bold">OFERTA LIMITADA</p>
      <img src="/nfts/sage.webp" alt="Sage Nomad #009, retrato de gorila com chapéu verde e moletom roxo" width={600} height={600} loading="lazy" className="aspect-[3/4] w-full rounded-xl object-cover" />
    </Link>
  )
}
