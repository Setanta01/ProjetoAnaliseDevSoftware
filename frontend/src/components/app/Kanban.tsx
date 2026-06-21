import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CalendarDays, MessageSquare, MoreHorizontal } from 'lucide-react'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

export const kanbanColumnWidth = 'w-[clamp(16rem,22vw,24rem)]'

export function KanbanColumn({ id, title, count, children }: { id: number; title: string; count: number; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `column-${id}` })

  return (
    <section ref={setNodeRef} className={cn('flex min-h-0 shrink-0 flex-col', kanbanColumnWidth)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-card-foreground">{title} <span className="ml-1 text-sm text-muted-foreground">({count})</span></h2>
        <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></Button>
      </div>
      <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-kanban-column p-2.5 transition-colors', isOver && 'border-primary bg-primary/5')}>{children}</div>
    </section>
  )
}

export function KanbanTaskCard({ task, canDrag = false, isOverlay = false, onClick }: { task: Task; canDrag?: boolean; isOverlay?: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    disabled: !canDrag || isOverlay,
    data: { taskId: task.id, columnId: task.coluna_id },
  })
  const deadline = getDeadlineState(task.due_date)
  const accent = task.impedido ? 'border-l-destructive' : deadline?.kind === 'urgent' ? 'border-l-urgent' : task.pronto_para_estimativa ? 'border-l-planning' : 'border-l-transparent'

  return (
    <button ref={isOverlay ? undefined : setNodeRef} className={cn('group relative block w-full rounded-md border border-l-4 border-border bg-card p-3.5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md', accent, canDrag && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-40', isOverlay && `rotate-1 opacity-95 shadow-2xl ${kanbanColumnWidth}`)} onClick={onClick} {...(isOverlay ? {} : listeners)} {...(isOverlay ? {} : attributes)}>
      {(task.tem_novidade || task.novos_comentarios) && <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"><MessageSquare className="h-3.5 w-3.5 fill-current" /></span>}
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant={task.tipo === 'BUG' ? 'danger' : 'neutral'}>{task.tipo === 'BUG' ? 'Bug' : 'Task'}</Badge>
        <Badge variant={task.prioridade === 'URGENTE' ? 'danger' : task.prioridade === 'ALTA' ? 'urgent' : task.prioridade === 'MEDIA' ? 'warning' : 'info'}>{priorityLabel(task.prioridade)}</Badge>
        {task.impedido && <Badge variant="danger">Bloqueado</Badge>}
        {task.aguardando_qa && <Badge variant="urgent">Aguardando QA</Badge>}
        {task.pronto_para_estimativa && !task.estimativa_consolidada && <Badge variant="planning">Planning Poker</Badge>}
        {deadline?.kind === 'urgent' && <Badge variant="urgent">Entrega em 24h</Badge>}
        {deadline?.kind === 'late' && <Badge variant="danger">Atrasado</Badge>}
      </div>
      <h3 className="mb-5 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary">{task.titulo}</h3>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="id">{task.codigo ?? `#${task.id}`}</Badge>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDueDate(task.due_date)}</span>}
          {task.responsavel_nome && <UserAvatar name={task.responsavel_nome} className="h-7 w-7" />}
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-2 font-semibold text-secondary-foreground">{task.estimativa_consolidada ?? '-'}</span>
        </div>
      </div>
    </button>
  )
}

function priorityLabel(priority: Task['prioridade']) {
  return { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }[priority]
}

function formatDueDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function getDeadlineState(value?: string) {
  if (!value) return null
  const due = new Date(`${value}T23:59:59`).getTime()
  const now = new Date('2026-06-11T12:00:00').getTime()
  const hours = (due - now) / 3_600_000
  if (hours < 0) return { kind: 'late' as const }
  if (hours <= 36) return { kind: 'urgent' as const }
  return { kind: 'normal' as const }
}
