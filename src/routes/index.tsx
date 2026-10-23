import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/CatalogSection'
import { nftListQuery } from '@/features/catalog/hooks'
import { MobileCatalogBar } from '@/features/catalog/MobileCatalogBar'
import { catalogSearchSchema, toListParams } from '@/features/catalog/search'
import { Journal, PromoBanners } from '@/features/home/EditorialSections'
import { Hero } from '@/features/home/Hero'
import { MobileHero } from '@/features/home/MobileHero'
import { useIsMobile } from '@/hooks/use-is-mobile'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListParams(search),
  // Warm the cache (also on link hover) without blocking: the page renders skeletons meanwhile.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
  },
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const isMobile = useIsMobile()
  return (
    <>
      {isMobile ? (
        <>
          <MobileCatalogBar search={search} />
          <MobileHero />
        </>
      ) : (
        <Hero />
      )}
      <CatalogSection search={search} />
      <PromoBanners />
      <Journal />
    </>
  )
}
