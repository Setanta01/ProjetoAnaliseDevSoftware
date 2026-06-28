// src/types.ts

export interface UserProfile {
  id: number;
  nome: string;
  email: string;
  admin: boolean;
  mfa_ativo: boolean;
  mfa_tipo: "TOTP" | "EMAIL" | null;
  tem_google: boolean;
}

export interface Projeto {
  id: number;
  nome: string;
  descricao?: string;
  criado_em?: string;
  member_count?: number;
  membros?: number;
  status?: string;
  arquivado?: boolean;
  cargo?: ProjectRole;
  meu_cargo?: ProjectRole;
}

export interface Sprint {
  id: number;
  nome: string;
  status: "PLANEJADA" | "ATIVA" | "ENCERRADA";
  projeto_id: number;
  total_cards?: number;
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
  criterios_aceitacao?: string;
  status: TaskStatus;
  prioridade: Prioridade;
  responsavel_id?: number;
  responsavel_nome?: string;
  sprint_id?: number;
  sprint_data_inicio?: string;
  projeto_id?: number;
  coluna_id?: number;
  coluna_nome?: string;
  backlog_id?: number;
  posicao?: number;
  criado_em?: string;
  codigo?: string;
  tipo?: CardType;
  due_date?: string;
  estimativa_consolidada?: number;
  impedido?: boolean;
  pronto_para_estimativa?: boolean;
  tem_novidade?: boolean;
  novos_comentarios?: boolean;
  aguardando_qa?: boolean;
  passos_reproducao?: string;
  resultado_esperado?: string;
  card_origem_id?: number | null;
  bugs_gerados?: Array<{
    id: number;
    codigo?: string;
    titulo: string;
    status?: TaskStatus;
  }>;
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
  anexos?: Anexo[];
}

export interface Anexo {
  id: number;
  nome: string;
  url: string;
  mime_type?: string;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  titulo: string;
  concluido: boolean;
}

export interface CardHistorico {
  id: number;
  card_id?: number;
  tipo: string;
  detalhe?: string;
  usuario_id?: number;
  usuario_nome?: string;
  criado_em: string;
}

export interface ValidacaoQA {
  id: number;
  resultado: "APROVADO" | "REPROVADO";
  observacao?: string;
  qa_id?: number;
  qa_nome?: string;
  criado_em: string;
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
  cargo?: Cargo;
  admin?: boolean;
  ativo: boolean;
  criado_em?: string;
}

export interface BoardColumn {
  id: number;
  nome: string;
  posicao: number;
  e_inicial?: boolean;
  e_final?: boolean;
}

export interface SprintDetail extends Sprint {
  colunas: BoardColumn[];
  cards: Task[];
}

export interface Estimativa {
  usuario_id: number;
  usuario_nome: string;
  valor: string | null;
  votou: boolean;
  revelada: boolean;
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
export type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

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
  URGENTE: "Urgente",
};
