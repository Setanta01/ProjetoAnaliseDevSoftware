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

export const CARGO_COLOR: Record<Cargo, { bg: string; text: string }> = {
  ADMIN:   { bg: "#EDE9FE", text: "#5B21B6" },
  GERENTE: { bg: "#DBEAFE", text: "#1D4ED8" },
  DEV:     { bg: "#D1FAE5", text: "#065F46" },
  QA:      { bg: "#FEF3C7", text: "#92400E" },
};

export const STATUS_COLOR: Record<TaskStatus, { bg: string; text: string }> = {
  BACKLOG:      { bg: "#F3F4F6", text: "#374151" },
  TODO:         { bg: "#DBEAFE", text: "#1E40AF" },
  EM_ANDAMENTO: { bg: "#FEF3C7", text: "#92400E" },
  REVISAO:      { bg: "#EDE9FE", text: "#5B21B6" },
  CONCLUIDO:    { bg: "#D1FAE5", text: "#065F46" },
  BLOQUEADO:    { bg: "#FEE2E2", text: "#991B1B" },
};

export const PRIORIDADE_COLOR: Record<Prioridade, { bg: string; text: string }> = {
  BAIXA:   { bg: "#D1FAE5", text: "#065F46" },
  MEDIA:   { bg: "#DBEAFE", text: "#1E40AF" },
  ALTA:    { bg: "#FEF3C7", text: "#92400E" },
  CRITICA: { bg: "#FEE2E2", text: "#991B1B" },
};