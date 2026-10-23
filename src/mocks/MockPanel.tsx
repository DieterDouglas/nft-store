import { useEffect, useState, useSyncExternalStore } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { connection } from '@/realtime/realtime'
import { SCENARIOS, type ScenarioId } from './scenarios'

/**
 * Demo/QA control panel. It only talks to the mock server over HTTP (/api/__mock/*);
 * every visible effect still arrives through REST responses or Socket.IO events.
 */

async function control(path: string, body?: unknown, method = 'POST') {
  const res = await fetch(`/api/__mock/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? `HTTP ${res.status}`)
}

const STATE_LABEL = { connecting: 'conectando', connected: 'conectado', reconnecting: 'reconectando', offline: 'desconectado' }

export default function MockPanel() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ScenarioId>('default')
  const socketState = useSyncExternalStore(connection.subscribe, connection.get)

  useEffect(() => {
    if (open) void fetch('/api/__mock/scenario').then((r) => r.json()).then((d) => setActive(d.active))
  }, [open])

  const run = (label: string, action: () => Promise<unknown>) => async () => {
    try {
      await action()
      toast.message(`Mock: ${label}`)
    } catch (e) {
      toast.error(`Mock: ${(e as Error).message}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="fixed bottom-4 left-4 z-40 shadow-lg max-md:top-1/2 max-md:bottom-auto max-md:left-0 max-md:-translate-y-1/2 max-md:rounded-l-none max-md:px-1.5" aria-label="Abrir painel de cenários simulados">
          <FlaskConical />
          <span className="hidden sm:inline">Cenários</span>
          <span aria-hidden className={`size-2 rounded-full ${socketState === 'connected' ? 'bg-success' : 'bg-destructive'}`} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cenários simulados (MSW)</SheetTitle>
          <SheetDescription>
            Socket.IO: <strong>{STATE_LABEL[socketState]}</strong>. Mudanças valem para as próximas requisições.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-bold">Cenário de rede/negócio</legend>
            <RadioGroup
              value={active}
              onValueChange={async (id) => {
                await control('scenario', { id }, 'PUT')
                setActive(id as ScenarioId)
                toast.message(`Cenário: ${id}`)
              }}
            >
              {(Object.entries(SCENARIOS) as [ScenarioId, string][]).map(([id, description]) => (
                <div key={id} className="flex items-start gap-2">
                  <RadioGroupItem id={`sc-${id}`} value={id} className="mt-1" />
                  <Label htmlFor={`sc-${id}`} className="block font-normal leading-snug">
                    <span className="font-bold">{id}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="grid gap-2">
            <p className="text-sm font-bold">Eventos e falhas sob demanda</p>
            <Button variant="outline" onClick={run('preço do 1º item do carrinho +0,10 ETH', () => control('cart-item-change', { kind: 'price' }))}>
              Alterar preço de item do carrinho
            </Button>
            <Button variant="outline" onClick={run('edição do 1º item esgotada', () => control('cart-item-change', { kind: 'sold-out' }))}>
              Esgotar item do carrinho
            </Button>
            <Button variant="outline" onClick={run('eventos reenviados (duplicados e antigos)', () => control('events/replay', { count: 5 }))}>
              Reenviar eventos duplicados/antigos
            </Button>
            <Button variant="outline" onClick={run('socket derrubado por 5 s', () => control('socket/drop', { offlineMs: 5000 }))}>
              Derrubar Socket.IO (5 s)
            </Button>
            <Button variant="outline" onClick={run('sessões expiradas', () => control('expire-sessions', {}))}>
              Expirar sessão atual
            </Button>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              await control('reset')
              localStorage.clear()
              window.location.assign('/')
            }}
          >
            Resetar dados e sessão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
