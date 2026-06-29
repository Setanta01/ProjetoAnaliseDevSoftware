import type { Prioridade } from '@/types'

export type ActivityTab = 'comments' | 'subtasks' | 'history'

export type EditCardFormState = {
  titulo: string
  descricao: string
  criteriosAceitacao: string
  prioridade: Prioridade
  responsavelId: string
  dueDate: string
  estimate: string
}

export type CardPatchPayload = {
  titulo: string
  descricao: string
  criterios_aceitacao: string
  prioridade: Prioridade
  responsavel_id?: number | null
  due_date?: string | null
  estimativa_consolidada?: number | null
  justificativa_prazo?: string
}

export interface ApiComment {
  id: number
  texto: string
  usuario_id?: number
  usuario_nome?: string
  autor_id?: number
  autor_nome?: string
  criado_em: string
  editado_em?: string
  anexos?: Array<{ id: number; nome: string; url: string; mime_type?: string }>
  mencionados?: Array<{ id: number; nome: string }>
}

export interface ApiChecklist {
  id: number
  titulo: string
  itens: Array<{ id: number; texto: string; concluido: boolean }>
}
