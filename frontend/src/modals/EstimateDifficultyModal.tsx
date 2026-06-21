import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleHelp, TriangleAlert } from 'lucide-react'
import api from '@/api'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Estimativa, Task } from '@/types'

export default function EstimateDifficultyModal({ task, open, onOpenChange, canManage = false, onDone }: { task: Task; open: boolean; onOpenChange: (open: boolean) => void; canManage?: boolean; onDone?: () => void }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | '?' | null>(null)
  const [consolidated, setConsolidated] = useState(task.estimativa_consolidada ? String(task.estimativa_consolidada) : '')
  const [loading, setLoading] = useState(false)
  const options: Array<number | '?'> = [1, 2, 3, 5, 8, 13, 21, '?']
  const pointOptions = [1, 2, 3, 5, 8, 13, 21]
  const { data: votes = [] } = useQuery({
    queryKey: ['task-estimates', task.id],
    queryFn: () => api.get<Estimativa[]>(`/cards/${task.id}/estimativas/`).then((response) => response.data),
    enabled: open,
  })

  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task', task.id] }),
      queryClient.invalidateQueries({ queryKey: ['board'] }),
    ])
    onDone?.()
    onOpenChange(false)
  }

  const submit = async () => {
    if (selected === null) return
    setLoading(true)
    try {
      await api.post(`/cards/${task.id}/estimativas/`, { valor: selected })
      await finish()
    } finally {
      setLoading(false)
    }
  }

  const reveal = async () => {
    if (!consolidated) return
    setLoading(true)
    try {
      await api.post(`/cards/${task.id}/estimativas/revelar/`, { estimativa_consolidada: Number(consolidated) })
      await finish()
    } finally {
      setLoading(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl p-0"><DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="flex items-center gap-2">Estimar Dificuldade <CircleHelp className="h-4 w-4 text-muted-foreground" /></DialogTitle><DialogDescription className="sr-only">Envie ou consolide a estimativa de Planning Poker.</DialogDescription></DialogHeader><div className="space-y-6 p-7"><p className="text-center text-sm text-muted-foreground">Qual o nível de esforço necessário para concluir a task {task.codigo ?? `#${task.id}`}?</p>{canManage ? <div className="space-y-4"><div className="rounded-md border border-border bg-muted p-3 text-sm"><p className="mb-2 font-semibold text-foreground">Votos recebidos</p>{votes.length ? <div className="space-y-1 text-muted-foreground">{votes.map((vote) => <p key={vote.usuario_id}>{vote.usuario_nome}: {vote.valor ?? 'votou'}</p>)}</div> : <p className="text-muted-foreground">Nenhum voto registrado ainda.</p>}</div><Select value={consolidated} onChange={(event) => setConsolidated(event.target.value)}><option value="">Escolha a estimativa final</option>{pointOptions.map((option) => <option key={option} value={option}>{option} pontos</option>)}</Select><Alert variant="warning" className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>O gerente pode fechar o Planning Poker mesmo se nem todos votaram.</span></Alert></div> : <><div className="grid grid-cols-4 gap-3">{options.map((option) => <button key={option} type="button" className={cn('h-16 rounded-lg border border-input bg-card text-lg font-bold shadow-sm transition hover:border-primary', selected === option && 'border-primary bg-accent text-primary ring-2 ring-primary/20')} onClick={() => setSelected(option)}>{option}</button>)}</div><Alert variant="warning" className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Seus votos serão ocultos até que o gerente decida revelar e fechar a estimativa para toda a equipe.</span></Alert></>}</div><DialogFooter className="border-t border-border bg-muted px-6 py-5"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>{canManage ? <Button onClick={() => void reveal()} disabled={!consolidated || loading}>{loading ? 'Fechando...' : 'Fechar Planning Poker'}</Button> : <Button onClick={() => void submit()} disabled={selected === null || loading}>{loading ? 'Enviando...' : 'Confirmar Voto'}</Button>}</DialogFooter></DialogContent></Dialog>
}
