import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Filter, Plus } from 'lucide-react'
import api from '@/api'
import { KanbanColumn, KanbanTaskCard } from '@/components/app/Kanban'
import { LoadingState } from '@/components/app/LoadingState'
import { PriorityBadge } from '@/components/app/TaskBadges'
import { ViewToggle, type ViewMode } from '@/components/app/ViewToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getSprintDeadlineState } from '@/lib/card-rules'
import type { ProjectRole, SprintDetail, Task } from '@/types'

interface BoardViewProps {
  sprintId: number | null
  projetoId: number | null
  projectName?: string
  onOpenCard: (id: number) => void
  onNewCard: () => void
  canManage: boolean
  currentUserId?: number
  currentRole?: ProjectRole | 'ADMIN'
}

const priorityWeight = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 } as const
const VIEW_MODE_STORAGE_KEY = 'lazuli_board_view_mode'

export default function BoardView({ sprintId, projectName, onOpenCard, onNewCard, canManage, currentUserId, currentRole }: BoardViewProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return saved === 'list' ? 'list' : 'kanban'
  })
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const { data: sprint, isLoading } = useQuery({
    queryKey: ['board', sprintId],
    queryFn: () => api.get<SprintDetail>(`/sprints/${sprintId}/`).then((response) => response.data),
    enabled: Boolean(sprintId),
    refetchInterval: 5000,
  })
  const moveCardMutation = useMutation({
    mutationFn: ({ taskId, columnId }: { taskId: number; columnId: number }) => api.patch<Task>(`/cards/${taskId}/`, { coluna_id: columnId }).then((response) => response.data),
    onMutate: async ({ taskId, columnId }) => {
      if (!sprintId) return { previousSprint: undefined as SprintDetail | undefined }
      await queryClient.cancelQueries({ queryKey: ['board', sprintId] })
      const previousSprint = queryClient.getQueryData<SprintDetail>(['board', sprintId])
      queryClient.setQueryData<SprintDetail>(['board', sprintId], (current) => {
        if (!current) return current
        const column = current.colunas.find((item) => item.id === columnId)
        return {
          ...current,
          cards: current.cards.map((task) => task.id === taskId ? { ...task, coluna_id: columnId, coluna_nome: column?.nome ?? task.coluna_nome } : task),
        }
      })
      return { previousSprint }
    },
    onError: (_error, _variables, context) => {
      if (sprintId && context?.previousSprint) queryClient.setQueryData(['board', sprintId], context.previousSprint)
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['board', sprintId] }),
        queryClient.invalidateQueries({ queryKey: ['task', variables?.taskId] }),
      ])
    },
  })

  if (!sprintId) return <div className="p-8 text-center text-muted-foreground">Selecione uma sprint ativa.</div>
  const tasks = sprint?.cards ?? []
  const columns = sprint?.colunas ?? []
  const visibleTasks = assignedToMeOnly && currentUserId ? tasks.filter((task) => task.responsavel_id === currentUserId) : tasks
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    const priorityDifference = priorityWeight[b.prioridade] - priorityWeight[a.prioridade]
    return priorityDifference || new Date(b.criado_em ?? 0).getTime() - new Date(a.criado_em ?? 0).getTime()
  })

  const openCard = async (id: number) => {
    await api.post(`/cards/${id}/marcar-visto/`)
    await queryClient.invalidateQueries({ queryKey: ['board', sprintId] })
    onOpenCard(id)
  }

  const moveCard = (taskId: number, columnId: number) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!canMoveTask(task, columnId)) return
    moveCardMutation.mutate({ taskId, columnId })
  }

  const canMoveTask = (task?: Task, targetColumnId?: number) => {
    if (!task) return false
    if (canManage || task.responsavel_id === currentUserId) return true
    const qaApprovedReview = currentRole === 'QA' && task.status === 'REVISAO' && task.ultima_validacao_resultado === 'APROVADO'
    if (!qaApprovedReview) return false
    if (!targetColumnId) return true
    const targetColumn = columns.find((column) => column.id === targetColumnId)
    return Boolean(targetColumn?.e_final || targetColumn?.nome === 'Done')
  }

  const setViewMode = (nextMode: ViewMode) => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode)
    setViewModeState(nextMode)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.data.current?.taskId
    setActiveTaskId(typeof taskId === 'number' ? taskId : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = event.active.data.current?.taskId
    const currentColumnId = event.active.data.current?.columnId
    const targetColumnId = typeof event.over?.id === 'string' && event.over.id.startsWith('column-') ? Number(event.over.id.replace('column-', '')) : null
    setActiveTaskId(null)
    if (typeof taskId !== 'number' || typeof currentColumnId !== 'number' || !targetColumnId || currentColumnId === targetColumnId) return
    moveCard(taskId, targetColumnId)
  }

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : undefined
  const canCreateCard = canManage || currentRole === 'QA' || currentRole === 'ADMIN'
  return (
    <main className="flex h-full flex-col overflow-hidden px-4 pt-5 xl:px-5">
      <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col overflow-hidden">
        <header className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-1 flex min-w-0 items-center gap-3"><Badge variant="info">Sprint Ativa</Badge>{projectName && <span className="truncate text-sm font-medium text-muted-foreground">{projectName}</span>}</div><h1 className="text-3xl font-bold tracking-tight text-foreground">Board {sprint?.nome ?? ''}</h1></div>
          <div className="flex flex-wrap items-center gap-3"><ViewToggle value={viewMode} onChange={setViewMode} /><Button variant={assignedToMeOnly ? 'secondary' : 'outline'} disabled={!currentUserId} onClick={() => setAssignedToMeOnly((value) => !value)}><Filter className="h-4 w-4" /> Minhas tarefas</Button>{canCreateCard && <Button onClick={onNewCard}><Plus className="h-4 w-4" /> {currentRole === 'QA' && !canManage ? 'Novo Bug' : 'Nova Task'}</Button>}</div>
        </header>
        {isLoading ? (
          <LoadingState label="Carregando quadro..." />
        ) : viewMode === 'kanban' ? (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragCancel={() => setActiveTaskId(null)} onDragEnd={handleDragEnd}>
            <div className="min-h-0 flex-1 overflow-x-auto pb-5">
              <div className="mx-auto flex h-full w-max min-w-full justify-center gap-3">
                {columns.map((column) => {
                  const columnTasks = sortedTasks.filter((task) => task.coluna_id === column.id)
                  return <KanbanColumn key={column.id} id={column.id} title={column.nome} count={columnTasks.length}>{columnTasks.map((task) => <KanbanTaskCard key={task.id} task={task} canDrag={canMoveTask(task)} onClick={() => void openCard(task.id)} />)}</KanbanColumn>
                })}
              </div>
            </div>
            <DragOverlay dropAnimation={null}>{activeTask && <KanbanTaskCard task={activeTask} isOverlay onClick={() => undefined} />}</DragOverlay>
          </DndContext>
        ) : (
          <div className="mb-6 flex-1 overflow-auto rounded-lg border border-border bg-card">
            <Table className="min-w-[1040px] table-fixed">
              <colgroup>
                <col className="w-28" />
                <col />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-32" />
                <col className="w-44" />
                <col className="w-20" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título / Tags</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Coluna</TableHead>
                  <TableHead className="text-center">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-b">
                {sortedTasks.map((task) => {
                  const deadline = getSprintDeadlineState(task)
                  const columnName = task.coluna_nome ?? columns.find((column) => column.id === task.coluna_id)?.nome ?? task.status

                  return (
                    <TableRow key={task.id} className="cursor-pointer border-border" onClick={() => void openCard(task.id)}>
                      <TableCell className="font-mono text-muted-foreground">{task.codigo ?? `#${task.id}`}</TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-0 truncate font-semibold" title={task.titulo}>{task.titulo}</span>
                          {task.impedido && <Badge variant="danger" className="shrink-0">Bloqueado</Badge>}
                          {deadline?.kind === 'late' && <Badge variant="warning" className="shrink-0">Atrasado</Badge>}
                          {task.pronto_para_estimativa && !task.estimativa_consolidada && <Badge variant="planning" className="shrink-0">Planning Poker</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Sprint</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem vínculo</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={task.tipo === 'BUG' ? 'danger' : 'neutral'}>{task.tipo === 'BUG' ? 'Bug' : 'Task'}</Badge></TableCell>
                      <TableCell><PriorityBadge prioridade={task.prioridade} /></TableCell>
                      <TableCell>
                        {canMoveTask(task) ? (
                          <div onClick={(event) => event.stopPropagation()}>
                            <Select
                              className="h-8"
                              value={String(task.coluna_id ?? '')}
                              onChange={(event) => moveCard(task.id, Number(event.target.value))}
                              aria-label={`Mover ${task.codigo ?? `#${task.id}`} para outra coluna`}
                            >
                              {columns.map((column) => (
                                <option
                                  key={column.id}
                                  value={column.id}
                                  disabled={column.id !== task.coluna_id && !canMoveTask(task, column.id)}
                                >
                                  {column.nome}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : (
                          <span className="truncate whitespace-nowrap" title={columnName}>{columnName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{task.estimativa_consolidada ?? '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  )
}
