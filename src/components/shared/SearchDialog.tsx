import { useState, type ReactElement } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/**
 * Catalog search dialog. The caller's button becomes a Radix DialogTrigger, so focus
 * returns to it when the dialog closes (keyboard users keep their place).
 */
export function SearchDialog({ trigger }: { trigger: ReactElement }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Procure por nome do NFT ou do criador.</DialogDescription>
        </DialogHeader>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
            void navigate({ to: '/', search: (prev) => ({ ...prev, q: q.trim() || undefined, page: undefined }), hash: 'catalogo' })
          }}
          className="flex gap-2"
        >
          <label htmlFor="global-search" className="sr-only">
            Termo de busca
          </label>
          <Input id="global-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Golden, Nomad…" autoFocus />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
