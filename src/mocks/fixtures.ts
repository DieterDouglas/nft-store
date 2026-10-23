import { CATEGORIES, NETWORKS, type Category, type Edition, type Network, type Nft } from '@/api/types'

/** Fixed clock for fixtures so "new releases" and ordering never drift between runs. */
export const FIXTURE_NOW = Date.parse('2026-10-01T12:00:00.000Z')
const DAY = 86_400_000

const IMAGES = {
  emerald: '/nfts/emerald.webp',
  sage: '/nfts/sage.webp',
  ivory: '/nfts/ivory.webp',
  golden: '/nfts/golden.webp',
} as const
type ImageKey = keyof typeof IMAGES

/** Mulberry32: tiny seeded PRNG so generated fixtures are identical on every reset. */
function prng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Spec {
  name: string
  price: string
  compareAtPrice?: string
  image: ImageKey
  category: Category
  network: Network
  rarity?: Nft['rarity']
}

// The nine pieces visible in the Figma home, in layout order.
const FIGMA: Spec[] = [
  { name: 'Emerald Ape #042', price: '1.19', image: 'emerald', category: 'arte-digital', network: 'ethereum' },
  { name: 'Sage Nomad #009', price: '1.69', image: 'sage', category: 'arte-digital', network: 'ethereum' },
  { name: 'Neon Vessel #552', price: '1.99', compareAtPrice: '2.29', image: 'ivory', category: 'colecionaveis', network: 'ethereum', rarity: 'raro' },
  { name: 'Cosmic Bloom #118', price: '1.29', image: 'sage', category: 'generativa', network: 'polygon' },
  { name: 'Violet Nomad #314', price: '1.39', image: 'sage', category: 'arte-digital', network: 'solana' },
  { name: 'Ivory Baron #088', price: '1.79', image: 'ivory', category: 'arte-3d', network: 'ethereum' },
  { name: 'Golden Beat #207', price: '0.99', image: 'golden', category: 'musica', network: 'polygon' },
  { name: 'Golden Frequency #071', price: '0.59', image: 'golden', category: 'musica', network: 'solana' },
  { name: 'Golden Signal #160', price: '0.39', image: 'golden', category: 'musica', network: 'ethereum' },
]

const PREFIXES = ['Amber', 'Onyx', 'Crimson', 'Jade', 'Cobalt', 'Velvet', 'Solar', 'Lunar', 'Rust', 'Copper', 'Ash', 'Moss', 'Saffron']
const SUFFIXES = ['Drifter', 'Monarch', 'Echo', 'Pilot', 'Relic', 'Oracle', 'Rider', 'Muse']
const IMAGE_KEYS = Object.keys(IMAGES) as ImageKey[]

function generated(count: number): Spec[] {
  const rand = prng(2026)
  return Array.from({ length: count }, (_, i) => {
    const r = rand()
    // Skewed towards cheaper pieces; tops out at the 12.30 ETH shown in the price filter.
    const price = (0.02 + Math.pow(r, 2.4) * 12.28).toFixed(2)
    return {
      name: `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[Math.floor(rand() * SUFFIXES.length)]} #${String(Math.floor(rand() * 900) + 100)}`,
      price: i === 7 ? '12.30' : i === 3 ? '0.02' : price,
      compareAtPrice: i % 11 === 5 ? (Number(price) * 1.2).toFixed(2) : undefined,
      image: IMAGE_KEYS[Math.floor(rand() * IMAGE_KEYS.length)],
      category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
      network: NETWORKS[Math.floor(rand() * NETWORKS.length)],
      rarity: i % 9 === 4 ? 'raro' : i % 17 === 12 ? 'lendario' : undefined,
    }
  })
}

const CREATORS = [
  { name: 'Marina Kato', handle: '@marinakato' },
  { name: 'Studio Cipó', handle: '@studiocipo' },
  { name: 'Theo Lumen', handle: '@theolumen' },
  { name: 'Ana Ferraz', handle: '@anaferraz' },
]

function editionsFor(index: number, basePrice: string, compareAt?: string): Edition[] {
  const base = Number(basePrice)
  const price = (factor: number) => (base * factor).toFixed(2)
  // Pills in the layout: 1/1 · 1/10 · 1/50 · ABERTA. The open edition carries the listed
  // (lowest) price, so catalog cards match the Figma values.
  const editions: Edition[] = []
  if (index % 3 === 0) {
    editions.push({ id: 'artista', label: 'Prova de artista', shortLabel: '1/1', price: price(3), available: 1, supply: 1, maxPerOrder: 1 })
  }
  editions.push(
    { id: 'genesis', label: 'Edição gênesis', shortLabel: '1/10', price: price(1.8), available: 4 + (index % 6), supply: 10, maxPerOrder: 3 },
    { id: 'colecionador', label: 'Edição colecionador', shortLabel: '1/50', price: price(1.4), available: 20 + (index % 25), supply: 50, maxPerOrder: 5 },
    { id: 'aberta', label: 'Edição aberta', shortLabel: 'ABERTA', price: basePrice, compareAtPrice: compareAt, available: 60 + index, supply: 500, maxPerOrder: 10 },
  )
  // Deterministic edge cases: one edition sold out, one NFT entirely sold out.
  if (index === 5) editions.find((e) => e.id === 'genesis')!.available = 0
  if (index === 20) editions.forEach((e) => (e.available = 0))
  return editions
}

const TRAITS = ['Óculos', 'Esmeralda', 'Chapéu', 'Moletom', 'Fones', 'Blazer', 'Brinco', 'Jaqueta college']
const REVIEWERS = ['Lia M.', 'Rafa T.', 'Joana P.', 'Caio S.', 'Duda R.', 'Igor N.']
const REVIEW_TEXTS = [
  'Arte impecável, os detalhes em alta resolução são ainda melhores do que na prévia.',
  'Transferência rápida para a carteira e procedência clara. Recomendo.',
  'Faz parte da minha coleção favorita. O criador é muito ativo com a comunidade.',
  'Ótimo custo-benefício para uma edição limitada.',
  'Cores lindas, combinam com o resto da série.',
]

function reviewsFor(index: number, count: number) {
  const rand = prng(index + 99)
  return Array.from({ length: Math.min(count, 6) }, (_, i) => ({
    id: `rev-${index}-${i}`,
    author: REVIEWERS[(index + i) % REVIEWERS.length],
    rating: rand() > 0.25 ? 5 : 4,
    text: REVIEW_TEXTS[(index + i) % REVIEW_TEXTS.length],
    createdAt: new Date(FIXTURE_NOW - (i + 1) * 3 * DAY).toISOString(),
  }))
}

export function buildNfts(): Nft[] {
  const specs = [...FIGMA, ...generated(39)]
  return specs.map((spec, index) => {
    const editions = editionsFor(index, spec.price, spec.compareAtPrice)
    const creator = CREATORS[index % CREATORS.length]
    // Gallery: the main view plus crops/variants of the same artwork (4 thumbnails in the layout).
    const others = IMAGE_KEYS.filter((k) => k !== spec.image)
    const id = `nft-${String(index + 1).padStart(3, '0')}`
    const tokenNumber = spec.name.match(/#(\d+)/)?.[1] ?? String(index + 1)
    const ratingCount = 5 + Math.floor(prng(index + 3)() * 30)
    const royalty = 5 + (index % 6)
    const hex = (index * 2654435761 >>> 0).toString(16).padStart(8, '0')
    return {
      id,
      name: spec.name,
      tokenId: `#${tokenNumber.padStart(4, '0')}`,
      collection: spec.image === 'golden' ? 'Kurio Beats' : 'Kurio Apes',
      image: IMAGES[spec.image],
      gallery: [IMAGES[spec.image], IMAGES[spec.image], ...others.slice(0, 2).map((k) => IMAGES[k])],
      category: spec.category,
      network: spec.network,
      price: lowestPrice(editions),
      compareAtPrice: spec.compareAtPrice,
      rarity: spec.rarity,
      soldOut: editions.every((e) => e.available === 0),
      createdAt: new Date(FIXTURE_NOW - index * 2 * DAY).toISOString(),
      version: 1,
      description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${spec.network === 'ethereum' ? 'Ethereum' : spec.network === 'polygon' ? 'Polygon' : 'Solana'}, com arte desbloqueável e acesso para colecionadores.`,
      creator,
      editions,
      favorites: Math.floor(prng(index + 7)() * 480) + 12,
      traits: [TRAITS[index % TRAITS.length], TRAITS[(index + 3) % TRAITS.length], ...(spec.rarity ? ['Raro'] : [])],
      contract: { address: `0x7A42${hex}${hex}${hex}${hex}19E8`, standard: spec.network === 'solana' ? 'Metaplex' : 'ERC-721', royaltyPercent: royalty },
      rating: { average: 4.8, count: ratingCount },
      reviews: reviewsFor(index, ratingCount),
    }
  })
}

export function lowestPrice(editions: Edition[]): string {
  const forSale = editions.filter((e) => e.available > 0)
  const pool = forSale.length ? forSale : editions
  return pool.reduce((min, e) => (Number(e.price) < Number(min) ? e.price : min), pool[0].price)
}

/** Demo accounts. Passwords are only hashed at seed time; plain text never reaches storage. */
export const SEED_USERS = [
  { id: 'usr-ana', name: 'Ana Colecionadora', username: 'ana.coleciona', email: 'ana@kurio.dev', password: 'Kurio@123', ensName: 'anacoleciona', walletNickname: 'Cofre da Ana' },
  { id: 'usr-bruno', name: 'Bruno Cripto', username: 'brunocripto', email: 'bruno@kurio.dev', password: 'Kurio@123', ensName: null, walletNickname: 'Carteira do Bruno' },
]


export const SEED_COUPONS = [
  { code: 'KURIO10', percentOff: 10, expiresAt: '2099-01-01T00:00:00.000Z' },
  { code: 'GENESIS15', percentOff: 15, expiresAt: '2099-01-01T00:00:00.000Z' },
  { code: 'EXPIRADO20', percentOff: 20, expiresAt: '2025-01-01T00:00:00.000Z' },
]

export const NETWORK_FEES: Record<Network, { base: string; perUnit: string }> = {
  // Calibrated so the Figma cart (17 units) shows a 0.016 ETH fee.
  ethereum: { base: '0.0048', perUnit: '0.0007' },
  polygon: { base: '0.0004', perUnit: '0.00005' },
  solana: { base: '0.0002', perUnit: '0.00002' },
}
