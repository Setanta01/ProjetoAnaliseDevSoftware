import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { Cargo, Prioridade, TaskStatus } from '@/types'
import { PRIORIDADE_LABEL, TASK_STATUS_LABEL } from '@/types'

const priorityVariant: Record<Prioridade, BadgeProps['variant']> = {
  BAIXA: 'info',
  MEDIA: 'warning',
  ALTA: 'urgent',
  CRITICA: 'danger',
}

const statusVariant: Record<TaskStatus, BadgeProps['variant']> = {
  BACKLOG: 'neutral',
  TODO: 'info',
  EM_ANDAMENTO: 'warning',
  REVISAO: 'planning',
  CONCLUIDO: 'success',
  BLOQUEADO: 'danger',
}

const roleVariant: Record<Cargo, BadgeProps['variant']> = {
  ADMIN: 'planning',
  GERENTE: 'info',
  DEV: 'success',
  QA: 'warning',
}

export function PriorityBadge({ prioridade }: { prioridade: Prioridade }) {
  return <Badge variant={priorityVariant[prioridade]}>{PRIORIDADE_LABEL[prioridade]}</Badge>
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={statusVariant[status]}>{TASK_STATUS_LABEL[status]}</Badge>
}

export function RoleBadge({ cargo }: { cargo: Cargo }) {
  return <Badge variant={roleVariant[cargo]}>{cargo}</Badge>
}
