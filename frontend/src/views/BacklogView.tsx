import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Trash2 } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { SearchField } from '@/components/app/SearchField'
import { PriorityBadge } from '@/components/app/TaskBadges'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Prioridade, ProjectRole, Task } from '@/types'

interface BacklogViewProps {
  projetoId: number | null
  activeSprintId?: number
  onNewCard: () => void
  onOpenCard: (id: number) => void
  canManage: boolean
  currentRole?: ProjectRole | 'ADMIN'
}

type BacklogSort = 'priority' | 'newest' | 'oldest'

const priorityWeight: Record<Prioridade, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 }
const sortOptions: Array<{ value: BacklogSort; label: string }> = [
  { value: 'priority', label: 'Prioridade' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
]

function SortPicker({ value, onChange }: { value: BacklogSort; onChange: (value: BacklogSort) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-input bg-card p-0.5" aria-label="Ordenar backlog">
      {sortOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`h-9 rounded px-3 text-xs font-semibold transition hover:bg-secondary ${value === option.value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function BacklogView({ projetoId, activeSprintId, onNewCard, onOpenCard, canManage, currentRole }: BacklogViewProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<BacklogSort>('priority')
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['backlog', projetoId],
    queryFn: () => api.get<Task[]>(`/projetos/${projetoId}/backlog/`).then((response) => response.data),
    enabled: Boolean(projetoId),
    refetchOnWindowFocus: 'always',
    refetchInterval: 10000,
  })
  const moveToSprint = useMutation({
    mutationFn: (taskId: number) => api.patch<Task>(`/cards/${taskId}/`, { sprint_id: activeSprintId }).then((response) => response.data),
    onSuccess: async (_task, taskId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['backlog', projetoId] }),
        queryClient.invalidateQueries({ queryKey: ['board', activeSprintId] }),
        queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
      ])
    },
  })
  const deleteCard = useMutation({
    mutationFn: (taskId: number) => api.delete(`/cards/${taskId}/`),
    onSuccess: async (_response, taskId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['backlog', projetoId] }),
        queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
      ])
    },
  })
  const filteredTasks = tasks.filter((task) => task.titulo.toLowerCase().includes(search.toLowerCase()))
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const createdA = new Date(a.criado_em ?? 0).getTime()
    const createdB = new Date(b.criado_em ?? 0).getTime()
    if (sortBy === 'newest') return createdB - createdA
    if (sortBy === 'oldest') return createdA - createdB
    return priorityWeight[b.prioridade] - priorityWeight[a.prioridade] || createdB - createdA
  })
  const canCreateCard = canManage || currentRole === 'QA' || currentRole === 'ADMIN'

  const confirmDelete = (task: Task) => {
    if (!window.confirm(`Remover a task "${task.titulo}"? Esta ação não pode ser desfeita.`)) return
    deleteCard.mutate(task.id)
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader title="Backlog de Tasks" subtitle="Gestão de tasks não atribuídas à sprint." actions={canCreateCard ? <Button onClick={onNewCard}><Plus className="h-4 w-4" /> {currentRole === 'QA' && !canManage ? 'Novo Bug' : 'Nova Task'}</Button> : undefined} />
      <DataPanel className="flex flex-1 flex-col">
        <div className="flex flex-col gap-3 border-b border-border bg-muted p-4 sm:flex-row sm:items-center">
          <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no backlog..." />
          <SortPicker value={sortBy} onChange={setSortBy} />
        </div>
        <div className="flex-1 overflow-x-auto">
          {isLoading ? <LoadingState variant="table" label="Carregando backlog..." /> : sortedTasks.length === 0 ? <EmptyState message="Backlog vazio" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>ID da Task</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Pontos</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>{sortedTasks.map((task) => (
                <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenCard(task.id)}>
                  <TableCell className="font-mono text-muted-foreground">{task.codigo ?? `#${task.id}`}</TableCell>
                  <TableCell className="font-semibold text-card-foreground">{task.titulo}</TableCell>
                  <TableCell><PriorityBadge prioridade={task.prioridade} /></TableCell>
                  <TableCell className="text-muted-foreground">{task.estimativa_consolidada ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        {activeSprintId && <Button variant="outline" size="sm" disabled={moveToSprint.isPending} onClick={(event) => { event.stopPropagation(); moveToSprint.mutate(task.id) }}>Mover para To do</Button>}
                        <Button variant="dangerSoft" size="icon" disabled={deleteCard.isPending} aria-label="Remover task" onClick={(event) => { event.stopPropagation(); confirmDelete(task) }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" aria-label="Mais ações" disabled><MoreVertical className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted px-6 py-4 text-sm text-muted-foreground"><span>Mostrando {sortedTasks.length} de {tasks.length} tasks</span><div className="flex gap-2"><Button variant="outline" size="icon" disabled><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" disabled><ChevronRight className="h-4 w-4" /></Button></div></div>
      </DataPanel>
    </PageContainer>
  )
}
