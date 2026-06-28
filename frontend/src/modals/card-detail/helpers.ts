import { apiBaseUrl } from '@/lib/env'
import type { Comentario, Task } from '@/types'
import type { ApiComment, EditCardFormState } from './types'

export function formFromTask(task: Task): EditCardFormState {
  return {
    titulo: task.titulo,
    descricao: task.descricao ?? '',
    criteriosAceitacao: task.criterios_aceitacao ?? '',
    prioridade: task.prioridade,
    responsavelId: task.responsavel_id ? String(task.responsavel_id) : '',
    dueDate: task.due_date ? 'SPRINT_ATUAL' : '',
    estimate: task.estimativa_consolidada ? String(task.estimativa_consolidada) : '',
  }
}

export function normalizeComment(comment: ApiComment): Comentario {
  return {
    id: comment.id,
    task_id: 0,
    usuario_id: comment.usuario_id ?? comment.autor_id ?? 0,
    usuario_nome: comment.usuario_nome ?? comment.autor_nome ?? 'Usuário',
    texto: comment.texto,
    criado_em: comment.criado_em,
    editado_em: comment.editado_em,
    anexos: comment.anexos ?? [],
  }
}

export function statusLabel(status: Task['status']) {
  return { BACKLOG: 'Backlog', TODO: 'A Fazer', EM_ANDAMENTO: 'Em Progresso', REVISAO: 'Revisão', CONCLUIDO: 'Concluído', BLOQUEADO: 'Bloqueado' }[status]
}

export function priorityLabel(priority: Task['prioridade']) {
  return { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }[priority]
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')
}

export function attachmentUrl(value: string) {
  if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value
  const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, '')
  return `${backendOrigin}${value.startsWith('/') ? value : `/${value}`}`
}
