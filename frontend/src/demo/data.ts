import type { Cargo, ChecklistItem, Comentario, ProjectMember, Projeto, Sprint, Task, UserProfile } from '@/types'

export interface DemoProfile extends UserProfile {
  cargo: Cargo
}

export interface DemoDatabase {
  projects: Projeto[]
  sprints: Sprint[]
  tasks: Task[]
  comments: Comentario[]
  checklistItems: ChecklistItem[]
  members: Record<number, ProjectMember[]>
  mfa: { active: boolean; type: 'TOTP' | 'EMAIL' | null }
}

export const demoProfiles: Record<Cargo, DemoProfile> = {
  ADMIN: { id: 1, nome: 'Ana Admin', email: 'ana.admin@lazuli.demo', admin: true, cargo: 'ADMIN', mfa_ativo: true, mfa_tipo: 'TOTP', tem_google: false },
  GERENTE: { id: 2, nome: 'Marina Gerente', email: 'marina@lazuli.demo', admin: false, cargo: 'GERENTE', mfa_ativo: false, mfa_tipo: null, tem_google: false },
  DEV: { id: 3, nome: 'Carlos Dev', email: 'carlos@lazuli.demo', admin: false, cargo: 'DEV', mfa_ativo: false, mfa_tipo: null, tem_google: false },
  QA: { id: 4, nome: 'Maria QA', email: 'maria@lazuli.demo', admin: false, cargo: 'QA', mfa_ativo: true, mfa_tipo: 'EMAIL', tem_google: false },
}

const projects: Projeto[] = [
  { id: 1, nome: 'Projeto Alfa', descricao: 'Plataforma de gestão ágil para equipes de software.', criado_em: '2026-05-10T10:00:00Z', member_count: 12, status: 'ATIVO', meu_cargo: 'DEV' },
  { id: 2, nome: 'Redesign do App Mobile', descricao: 'Modernização da experiência mobile do produto.', criado_em: '2026-04-18T14:30:00Z', member_count: 8, status: 'ATIVO', meu_cargo: 'QA' },
  { id: 3, nome: 'Portal do Cliente V2 (Beta)', descricao: 'Nova área de autoatendimento para clientes.', criado_em: '2026-03-02T09:15:00Z', member_count: 15, status: 'ATIVO', meu_cargo: 'GERENTE' },
  { id: 4, nome: 'Atualização de Banco de Dados Legacy', descricao: 'Migração gradual do banco legado.', criado_em: '2026-01-12T09:15:00Z', member_count: 3, status: 'INATIVO' },
]

const sprints: Sprint[] = [
  { id: 11, nome: 'Sprint 5', status: 'ATIVA', projeto_id: 1, total_tasks: 9, concluidas: 3, progresso: 33, data_inicio: '2026-06-08', data_fim: '2026-06-15', criado_em: '2026-06-06T12:00:00Z' },
  { id: 10, nome: 'Sprint 4', status: 'ENCERRADA', projeto_id: 1, total_tasks: 12, total_cards: 12, concluidas: 12, progresso: 100, data_inicio: '2026-05-25', data_fim: '2026-06-05', criado_em: '2026-05-23T12:00:00Z' },
  { id: 9, nome: 'Sprint 3', status: 'ENCERRADA', projeto_id: 1, total_tasks: 10, total_cards: 10, concluidas: 8, progresso: 80, data_inicio: '2026-05-11', data_fim: '2026-05-22', criado_em: '2026-05-09T12:00:00Z' },
  { id: 21, nome: 'Sprint Portal 2', status: 'ATIVA', projeto_id: 2, total_tasks: 7, concluidas: 2, progresso: 29, data_inicio: '2026-06-08', data_fim: '2026-06-19', criado_em: '2026-06-06T12:00:00Z' },
]

const tasks: Task[] = [
  { id: 101, codigo: '#4A56', titulo: 'Corrigir condição de corrida no webhook de processamento de pagamentos', descricao: 'Evitar processamento duplicado quando dois eventos chegam simultaneamente.', criterios_aceitacao: '- Apenas um evento deve ser persistido.\n- Requisições duplicadas devem retornar sucesso idempotente.', tipo: 'BUG', status: 'TODO', prioridade: 'ALTA', responsavel_id: 3, responsavel_nome: 'Carlos Dev', sprint_id: 11, projeto_id: 1, due_date: '2026-06-14', estimativa_consolidada: 3, posicao: 1, criado_em: '2026-06-10T09:00:00Z' },
  { id: 102, codigo: '#8C21', titulo: 'Projetar novo fluxo de integração de usuários para clientes corporativos', descricao: 'Necessitamos criar um fluxo simplificado para usuários corporativos.', criterios_aceitacao: '- Tela de convite enviada por email.\n- Adoção de SSO se disponível.', tipo: 'TAREFA', status: 'TODO', prioridade: 'BAIXA', responsavel_id: 3, responsavel_nome: 'João Silva', sprint_id: 11, projeto_id: 1, due_date: '2026-06-12', estimativa_consolidada: 5, tem_novidade: true, novos_comentarios: true, posicao: 2, criado_em: '2026-06-09T14:00:00Z' },
  { id: 103, codigo: '#B7D2', titulo: 'Atualizar ano de direitos autorais no rodapé de todas as páginas de marketing', descricao: 'Alterar o ano para 2026 em todos os footers.', tipo: 'TAREFA', status: 'TODO', prioridade: 'BAIXA', responsavel_id: 4, responsavel_nome: 'Maria Santos', sprint_id: 11, projeto_id: 1, due_date: '2026-06-18', pronto_para_estimativa: true, posicao: 3, criado_em: '2026-06-11T08:30:00Z' },
  { id: 104, codigo: '#19AF', titulo: 'Resolver vazamento de memória no serviço de exportação de PDF', descricao: 'O worker mantém referências após finalizar a exportação.', tipo: 'BUG', status: 'EM_ANDAMENTO', prioridade: 'ALTA', responsavel_id: 3, responsavel_nome: 'Carlos Dev', sprint_id: 11, projeto_id: 1, due_date: '2026-06-10', estimativa_consolidada: 5, impedido: true, tem_novidade: true, novos_comentarios: true, posicao: 1, criado_em: '2026-06-10T16:00:00Z' },
  { id: 105, codigo: '#E034', titulo: 'Implementar recursos de colaboração em tempo real na tela', descricao: 'Atualizar a atividade do card por short polling.', tipo: 'TAREFA', status: 'EM_ANDAMENTO', prioridade: 'MEDIA', responsavel_id: 5, responsavel_nome: 'Pedro Gomes', sprint_id: 11, projeto_id: 1, due_date: '2026-06-19', estimativa_consolidada: 8, posicao: 2, criado_em: '2026-06-09T11:00:00Z' },
  { id: 106, codigo: '#6F90', titulo: 'Migrar endpoints de autenticação legados para a API v2', descricao: 'Substituir as rotas antigas mantendo compatibilidade.', tipo: 'TAREFA', status: 'REVISAO', prioridade: 'MEDIA', responsavel_id: 4, responsavel_nome: 'Maria Santos', sprint_id: 11, projeto_id: 1, due_date: '2026-06-16', estimativa_consolidada: 8, aguardando_qa: true, posicao: 1, criado_em: '2026-06-08T10:00:00Z' },
  { id: 107, codigo: '#2B18', titulo: 'Adicionar filtros na página principal', descricao: 'Permitir filtrar por prioridade e responsável.', tipo: 'TAREFA', status: 'CONCLUIDO', prioridade: 'BAIXA', responsavel_id: 4, responsavel_nome: 'Maria QA', sprint_id: 11, projeto_id: 1, due_date: '2026-06-09', estimativa_consolidada: 3, posicao: 1, criado_em: '2026-06-08T13:00:00Z' },
  { id: 201, codigo: '#D442', titulo: 'Implementar autenticação OAuth 2.0', descricao: 'Definir fluxo e telas para autenticação externa.', tipo: 'TAREFA', status: 'BACKLOG', prioridade: 'ALTA', estimativa_consolidada: 8, projeto_id: 1, criado_em: '2026-06-06T09:00:00Z' },
  { id: 202, codigo: '#0F7C', titulo: 'Otimizar queries do painel operacional', descricao: 'Reduzir consultas repetidas no carregamento.', tipo: 'TAREFA', status: 'BACKLOG', prioridade: 'MEDIA', projeto_id: 1, criado_em: '2026-06-05T12:00:00Z' },
  { id: 203, codigo: '#93AB', titulo: 'Atualizar documentação da API de pagamentos', descricao: 'Revisar exemplos e códigos de erro.', tipo: 'TAREFA', status: 'BACKLOG', prioridade: 'BAIXA', estimativa_consolidada: 2, projeto_id: 1, criado_em: '2026-06-04T10:00:00Z' },
  { id: 301, titulo: 'Atualizar área de matrículas', descricao: 'Reestruturar a visão principal do aluno.', status: 'EM_ANDAMENTO', prioridade: 'ALTA', responsavel_nome: 'Carlos Dev', sprint_id: 21, projeto_id: 2, criado_em: '2026-06-10T10:00:00Z' },
]

const comments: Comentario[] = [
  { id: 1, task_id: 102, usuario_id: 4, usuario_nome: 'Maria Santos', texto: 'Começando a integração com o provedor Google. A documentação inicial parece boa.', criado_em: '2026-06-11T09:20:00Z' },
  { id: 2, task_id: 102, usuario_id: 5, usuario_nome: 'Pedro Gomes', texto: 'Revisei o fluxo no diagrama anexo e parece correto. Falta apenas tratar o refresh token de forma segura no backend antes de fecharmos a PR.', criado_em: '2026-06-11T11:50:00Z' },
  { id: 3, task_id: 103, usuario_id: 4, usuario_nome: 'Maria Santos', texto: 'O levantamento das páginas afetadas foi concluído.', criado_em: '2026-06-11T10:10:00Z' },
]

const checklistItems: ChecklistItem[] = [
  { id: 1, task_id: 102, titulo: 'Analisar documentação OAuth', concluido: true },
  { id: 2, task_id: 102, titulo: 'Configurar credenciais no Google Cloud Console', concluido: true },
  { id: 3, task_id: 102, titulo: 'Implementar callback/redirect no frontend', concluido: false },
  { id: 4, task_id: 102, titulo: 'Tratar renovação de tokens (Refresh token)', concluido: false },
]

const members: Record<number, ProjectMember[]> = {
  1: [
    { id: 2, nome: 'Marina Gerente', email: 'marina@lazuli.demo', cargo: 'GERENTE' },
    { id: 3, nome: 'Carlos Dev', email: 'carlos@lazuli.demo', cargo: 'DEV' },
    { id: 4, nome: 'Maria Santos', email: 'maria@lazuli.demo', cargo: 'QA' },
    { id: 5, nome: 'Pedro Gomes', email: 'pedro@lazuli.demo', cargo: 'DEV' },
  ],
  2: [{ id: 4, nome: 'Maria Santos', email: 'maria@lazuli.demo', cargo: 'QA' }],
  3: [{ id: 2, nome: 'Marina Gerente', email: 'marina@lazuli.demo', cargo: 'GERENTE' }],
  4: [],
}

export function createDemoDatabase(): DemoDatabase {
  return {
    projects: structuredClone(projects),
    sprints: structuredClone(sprints),
    tasks: structuredClone(tasks),
    comments: structuredClone(comments),
    checklistItems: structuredClone(checklistItems),
    members: structuredClone(members),
    mfa: { active: false, type: null },
  }
}
