import { useState } from 'react'
import { CircleHelp, TriangleAlert } from 'lucide-react'
import api from '@/api'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

export default function EstimateDifficultyModal({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const options = [1, 2, 3, 5, 8, 13, 21, 0]

  const submit = async () => {
    if (selected === null) return
    setLoading(true)
    try {
      await api.post(`/tasks/${task.id}/estimativas/`, { valor: selected })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl p-0"><DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="flex items-center gap-2">Estimar Dificuldade <CircleHelp className="h-4 w-4 text-muted-foreground" /></DialogTitle><DialogDescription className="sr-only">Envie seu voto privado de Planning Poker.</DialogDescription></DialogHeader><div className="space-y-6 p-7"><p className="text-center text-sm text-muted-foreground">Qual o nível de esforço necessário para concluir a task {task.codigo ?? task.id}?</p><div className="grid grid-cols-4 gap-3">{options.map((option) => <button key={option} className={cn('h-16 rounded-lg border border-input bg-card text-lg font-bold shadow-sm transition hover:border-primary', selected === option && 'border-primary bg-accent text-primary ring-2 ring-primary/20')} onClick={() => setSelected(option)}>{option || '?'}</button>)}</div><Alert variant="warning" className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Seus votos serão ocultos até que o gerente decida revelar e fechar a estimativa para toda a equipe.</span></Alert></div><DialogFooter className="border-t border-border bg-muted px-6 py-5"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => void submit()} disabled={selected === null || loading}>{loading ? 'Enviando...' : 'Confirmar Voto'}</Button></DialogFooter></DialogContent></Dialog>
}
