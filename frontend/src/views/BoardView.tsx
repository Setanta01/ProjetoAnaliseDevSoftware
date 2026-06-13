import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Plus, Users } from 'lucide-react'
import api from '@/api'
import { KanbanColumn, KanbanTaskCard } from '@/components/app/Kanban'
import { LoadingState } from '@/components/app/LoadingState'
import { ViewToggle, type ViewMode } from '@/components/app/ViewToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Task, TaskStatus } from '@/types'

interface BoardViewProps {
  sprintId: number | null
  projetoId: number | null
  onOpenCard: (id: number) => void
  onNewCard: () => void
  isAdmin: boolean
}

const columns: Array<{ status: TaskStatus; title: string }> = [
  { status: 'TODO', title: 'A Fazer' },
  { status: 'EM_ANDAMENTO', title: 'Em Progresso' },
  { status: 'REVISAO', title: 'Revisão' },
  { status: 'CONCLUIDO', title: 'Concluído' },
]

const priorityWeight = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 } as const

export default function BoardView({ sprintId, onOpenCard, onNewCard }: BoardViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['board', sprintId],
    queryFn: () => api.get<Task[]>(`/tasks/?sprint_id=${sprintId}`).then((response) => response.data),
    enabled: Boolean(sprintId),
    refetchInterval: 5000,
  })

  if (!sprintId) return <div className="p-8 text-center text-muted-foreground">Selecione uma sprint ativa.</div>
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityDifference = priorityWeight[b.prioridade] - priorityWeight[a.prioridade]
    return priorityDifference || new Date(b.criado_em ?? 0).getTime() - new Date(a.criado_em ?? 0).getTime()
  })

  const openCard = async (id: number) => {
    await api.post(`/tasks/${id}/marcar-visto/`)
    onOpenCard(id)
  }

  return (
    <main className="flex h-full flex-col overflow-hidden px-6 pt-6">
      <header className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="mb-1 flex items-center gap-3"><Badge variant="info">Sprint Ativa</Badge><span className="text-sm text-muted-foreground">Termina em 4 dias</span></div><h1 className="text-3xl font-bold tracking-tight text-foreground">Quadro da Sprint 5</h1></div>
        <div className="flex flex-wrap items-center gap-3"><ViewToggle value={viewMode} onChange={setViewMode} /><Button variant="ghost" size="icon" aria-label="Membros"><Users className="h-5 w-5" /></Button><Button variant="outline"><Filter className="h-4 w-4" /> Filtrar</Button><Button onClick={onNewCard}><Plus className="h-4 w-4" /> Nova Task</Button></div>
      </header>
      {isLoading ? (
        <LoadingState label="Carregando quadro..." />
      ) : viewMode === 'kanban' ? (
        <div className="flex flex-1 gap-6 overflow-x-auto pb-6">
          {columns.map((column) => {
            const columnTasks = sortedTasks.filter((task) => task.status === column.status)
            return <KanbanColumn key={column.status} title={column.title} count={columnTasks.length}>{columnTasks.map((task) => <KanbanTaskCard key={task.id} task={task} onClick={() => void openCard(task.id)} />)}</KanbanColumn>
          })}
        </div>
      ) : (
        <div className="mb-6 flex-1 overflow-y-auto rounded-lg border border-border bg-card"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Pontos</TableHead></TableRow></TableHeader><TableBody>{sortedTasks.map((task) => <TableRow key={task.id} className="cursor-pointer" onClick={() => void openCard(task.id)}><TableCell className="font-mono text-muted-foreground">{task.codigo ?? task.id}</TableCell><TableCell className="font-semibold">{task.titulo}</TableCell><TableCell><Badge variant={task.tipo === 'BUG' ? 'danger' : 'neutral'}>{task.tipo === 'BUG' ? 'Bug' : 'Task'}</Badge></TableCell><TableCell>{task.prioridade}</TableCell><TableCell>{columns.find((column) => column.status === task.status)?.title ?? task.status}</TableCell><TableCell>{task.estimativa_consolidada ?? '-'}</TableCell></TableRow>)}</TableBody></Table></div>
      )}
    </main>
  )
}
