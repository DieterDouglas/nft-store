import { createFileRoute, Link } from '@tanstack/react-router'
import { QueryError, StateMessage } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { AccountLayout } from '@/features/account/AccountLayout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'
import { useFavorites } from '@/features/favorites/hooks'

export const Route = createFileRoute('/_auth/favoritos')({
  component: Wishlist,
})

function Wishlist() {
  const favorites = useFavorites()
  return (
    <AccountLayout>
      <h1 className="mb-6 font-bold">Lista de interesse</h1>
      {favorites.isPending ? (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3" aria-busy="true" aria-label="Carregando favoritos">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      ) : favorites.isError ? (
        <QueryError error={favorites.error} onRetry={() => void favorites.refetch()} />
      ) : favorites.data.items.length === 0 ? (
        <StateMessage
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para guardá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {favorites.data.items.map((nft) => (
            <li key={nft.id}>
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  )
}
