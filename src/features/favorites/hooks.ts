import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, qk } from '@/api/endpoints'
import { useUserId } from '@/hooks/use-session'

export function useFavorites() {
  const userId = useUserId()
  return useQuery({
    queryKey: qk.favorites(userId ?? 'anonymous'),
    queryFn: ({ signal }) => api.favorites.list({ signal }),
    enabled: Boolean(userId),
  })
}

/** Optimistic toggle: the heart flips immediately and rolls back if the API rejects it. */
export function useToggleFavorite() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const key = qk.favorites(userId ?? 'anonymous')

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? api.favorites.add(nftId) : api.favorites.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<{ ids: string[]; items: unknown[] }>(key)
      queryClient.setQueryData(key, (old: typeof previous) => {
        const ids = old?.ids ?? []
        return { items: [], ...old, ids: favorite ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId) }
      })
      return { previous }
    },
    onError: (_error, { name }, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(`Não foi possível atualizar "${name}" nos favoritos. A alteração foi desfeita.`)
    },
    onSuccess: (_data, { favorite, name }) => {
      toast.success(favorite ? `"${name}" adicionado aos favoritos.` : `"${name}" removido dos favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
