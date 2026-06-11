// src/types.ts

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  cargo: Cargo;
}

export interface Projeto {
  id: number;
  nome: string;
  descricao?: string;
  criado_em?: string;
  member_count?: number;
  status?: string;
  meu_cargo?: ProjectRole;
}

export interface Sprint {
  id: number;
  nome: string;
  status: "PLANEJADA" | "ATIVA" | "CONCLUIDA";
  projeto_id: number;
  total_tasks?: number;
  concluidas?: number;
  progresso?: number;
  data_inicio?: string;
  data_fim?: string;
  criado_em?: string;
}

export interface Task {
  id: number;
  titulo: string;
  descricao?: string;
  status: TaskStatus;
  prioridade: Prioridade;
  responsavel_id?: number;
  responsavel_nome?: string;
  sprint_id?: number;
  projeto_id?: number;
  backlog_id?: number;
  posicao?: number;
  criado_em?: string;
  codigo?: string;
  tipo?: CardType;
  due_date?: string;
  estimativa_consolidada?: number;
  criterios_aceitacao?: string;
  impedido?: boolean;
  pronto_para_estimativa?: boolean;
  tem_novidade?: boolean;
  novos_comentarios?: boolean;
  aguardando_qa?: boolean;
  passos_reproducao?: string;
  resultado_esperado?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  titulo: string;
  status: "TODO" | "EM_ANDAMENTO" | "CONCLUIDO";
  posicao?: number;
  responsavel_id?: number;
  responsavel_nome?: string;
}

export interface Comentario {
  id: number;
  task_id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_avatar?: string;
  texto: string;
  criado_em: string;
  editado_em?: string;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  titulo: string;
  concluido: boolean;
}

export interface ProjectMember {
  id: number;
  nome: string;
  email: string;
  cargo: ProjectRole;
  avatar?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
  ativo: boolean;
  criado_em?: string;
}

export interface AdminStats {
  total_usuarios: number;
  total_projetos: number;
  sprints_ativas: number;
  convites_pendentes: number;
}

export type Cargo = "ADMIN" | "GERENTE" | "DEV" | "QA";
export type ProjectRole = "GERENTE" | "DEV" | "QA";
export type CardType = "TAREFA" | "BUG";
export type TaskStatus = "BACKLOG" | "TODO" | "EM_ANDAMENTO" | "REVISAO" | "CONCLUIDO" | "BLOQUEADO";
export type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG:      "Backlog",
  TODO:         "A Fazer",
  EM_ANDAMENTO: "Em Progresso",
  REVISAO:      "Revisão",
  CONCLUIDO:    "Concluído",
  BLOQUEADO:    "Bloqueado",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  BAIXA:   "Baixa",
  MEDIA:   "Média",
  ALTA:    "Alta",
  CRITICA: "Urgente",
};
