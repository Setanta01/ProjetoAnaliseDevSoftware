import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createDemoDatabase, type DemoDatabase } from '@/demo/data'
import type { BoardColumn, ChecklistItem, Comentario, Prioridade, Projeto, Sprint, Task, TaskStatus, Usuario, ValidacaoQA } from '@/types'

const STORAGE_KEY = 'lazuli_demo_database_v2'
const DEMO_DELAY_MS = 180

function loadDatabase(): DemoDatabase {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return createDemoDatabase()
  try {
    const parsed = JSON.parse(saved) as DemoDatabase
    const fresh = createDemoDatabase()
    return {
      ...fresh,
      ...parsed,
      history: parsed.history ?? fresh.history,
      validations: parsed.validations ?? fresh.validations,
      sprintSnapshots: parsed.sprintSnapshots ?? fresh.sprintSnapshots,
    }
  } catch {
    return createDemoDatabase()
  }
}

let database = loadDatabase()

function saveDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database))
}

export function resetDemoDatabase() {
  database = createDemoDatabase()
  saveDatabase()
}

function response<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: status === 200 ? 'OK' : 'Created', headers: {}, config }
}

function parsePayload<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

function nextId(items: Array<{ id: number }>) {
  return Math.max(0, ...items.map((item) => item.id)) + 1
}

function shortCode(id: number) {
  return `#${id.toString(16).toUpperCase().padStart(4, '0').slice(-4)}`
}

function projectWithState(project: Projeto): Projeto {
  const memberCount = database.members[project.id]?.length ?? project.member_count ?? 0
  const hasActiveSprint = database.sprints.some((sprint) => sprint.projeto_id === project.id && sprint.status === 'ATIVA')
  return { ...project, member_count: memberCount, status: project.arquivado ? 'INATIVO' : hasActiveSprint ? 'ATIVO' : 'PAUSADO' }
}

function sprintWithCounts(sprint: Sprint): Sprint {
  const cards = sprint.status === 'ENCERRADA' && database.sprintSnapshots[sprint.id]?.length
    ? database.sprintSnapshots[sprint.id]
    : database.tasks.filter((task) => task.sprint_id === sprint.id)
  const totalCards = cards.length
  const concluidas = cards.filter((task) => task.status === 'CONCLUIDO').length
  return {
    ...sprint,
    total_cards: totalCards,
    total_tasks: cards.filter((task) => task.tipo !== 'BUG').length,
    total_bugs: cards.filter((task) => task.tipo === 'BUG').length,
    concluidas,
    progresso: totalCards ? Math.round((concluidas / totalCards) * 100) : 0,
  }
}

const demoColumns: BoardColumn[] = [
  { id: 1, nome: 'To do', posicao: 1, e_inicial: true },
  { id: 2, nome: 'In Progress', posicao: 2 },
  { id: 3, nome: 'Review', posicao: 3 },
  { id: 4, nome: 'Done', posicao: 4, e_final: true },
]

function columnIdForStatus(status: TaskStatus) {
  return { TODO: 1, EM_ANDAMENTO: 2, REVISAO: 3, CONCLUIDO: 4, BACKLOG: undefined, BLOQUEADO: 2 }[status]
}

function columnNameForStatus(status: TaskStatus) {
  return demoColumns.find((column) => column.id === columnIdForStatus(status))?.nome
}

function usersFromMembers(): Usuario[] {
  const users = new Map<number, Usuario>()
  Object.values(database.members).flat().forEach((member) => {
    users.set(member.id, { id: member.id, nome: member.nome, email: member.email, ativo: true })
  })
  users.set(1, { id: 1, nome: 'Ana Admin', email: 'ana.admin@lazuli.demo', ativo: true, admin: true })
  return [...users.values()]
}

async function handleRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, DEMO_DELAY_MS))
  const method = config.method?.toUpperCase() ?? 'GET'
  const url = new URL(config.url ?? '/', 'http://lazuli.demo')
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/'

  if (method === 'GET' && path === '/projetos') return response(config, structuredClone(database.projects.filter((project) => project.meu_cargo).map(projectWithState)))
  if (method === 'GET' && path === '/admin/projetos') return response(config, structuredClone(database.projects.map(projectWithState)))
  if (method === 'GET' && path === '/usuarios') return response(config, usersFromMembers())
  if (method === 'GET' && path === '/sprints') return response(config, structuredClone(database.sprints))

  const projectDetailMatch = path.match(/^\/projetos\/(\d+)$/)
  if (method === 'GET' && projectDetailMatch) {
    const project = database.projects.find((item) => item.id === Number(projectDetailMatch[1]))
    if (!project) throw new Error('Projeto não encontrado no modo demonstração.')
    return response(config, structuredClone(projectWithState(project)))
  }

  const projectSprintsMatch = path.match(/^\/projetos\/(\d+)\/sprints$/)
  if (method === 'GET' && projectSprintsMatch) return response(config, structuredClone(database.sprints.filter((sprint) => sprint.projeto_id === Number(projectSprintsMatch[1])).map(sprintWithCounts)))
  if (method === 'POST' && projectSprintsMatch) {
    const payload = parsePayload<{ nome?: string }>(config.data || {})
    const projectId = Number(projectSprintsMatch[1])
    const projectSprints = database.sprints.filter((sprint) => sprint.projeto_id === projectId)
    const maxIndex = projectSprints.reduce((current, sprint) => {
      const match = /^Sprint\s+(\d+)$/i.exec(sprint.nome)
      return match ? Math.max(current, Number(match[1])) : current
    }, 0)
    const nextIndex = (maxIndex || projectSprints.length) + 1
    const sprint: Sprint = { id: nextId(database.sprints), nome: payload.nome || `Sprint ${String(nextIndex).padStart(2, '0')}`, status: 'PLANEJADA', projeto_id: projectId, criado_em: new Date().toISOString() }
    database.sprints.push(sprint)
    saveDatabase()
    return response(config, structuredClone(sprint), 201)
  }

  const projectMembersMatch = path.match(/^\/projetos\/(\d+)\/membros$/)
  if (method === 'GET' && projectMembersMatch) return response(config, structuredClone(database.members[Number(projectMembersMatch[1])] ?? []))
  if (method === 'POST' && projectMembersMatch) {
    const projectId = Number(projectMembersMatch[1])
    const payload = parsePayload<{ usuario_id: number; cargo: 'GERENTE' | 'DEV' | 'QA' }>(config.data)
    const user = usersFromMembers().find((item) => item.id === payload.usuario_id)
    if (!user) throw new Error('Usuário não encontrado no modo demonstração.')
    database.members[projectId] ??= []
    database.members[projectId].push({ id: user.id, nome: user.nome, email: user.email, cargo: payload.cargo })
    saveDatabase()
    return response(config, database.members[projectId].at(-1), 201)
  }

  const projectMemberDetailMatch = path.match(/^\/projetos\/(\d+)\/membros\/(\d+)$/)
  if (projectMemberDetailMatch) {
    const projectId = Number(projectMemberDetailMatch[1])
    const userId = Number(projectMemberDetailMatch[2])
    const members = database.members[projectId] ?? []
    const member = members.find((item) => item.id === userId)
    if (!member) throw new Error('Membro não encontrado no modo demonstração.')
    if (method === 'PATCH') {
      Object.assign(member, parsePayload<Partial<typeof member>>(config.data))
      saveDatabase()
      return response(config, structuredClone(member))
    }
    if (method === 'DELETE') {
      database.members[projectId] = members.filter((item) => item.id !== userId)
      saveDatabase()
      return response(config, null, 204)
    }
  }

  const sprintDetailMatch = path.match(/^\/sprints\/(\d+)$/)
  if (method === 'GET' && sprintDetailMatch) {
    const sprintId = Number(sprintDetailMatch[1])
    const sprint = database.sprints.find((item) => item.id === sprintId)
    if (!sprint) throw new Error('Sprint não encontrada no modo demonstração.')
    const sourceCards = sprint.status === 'ENCERRADA' && database.sprintSnapshots[sprintId]?.length
      ? database.sprintSnapshots[sprintId]
      : database.tasks.filter((task) => task.sprint_id === sprintId)
    const cards = sourceCards.map((task) => ({ ...task, sprint_data_inicio: sprint.data_inicio, coluna_id: task.coluna_id ?? columnIdForStatus(task.status), coluna_nome: task.coluna_nome ?? columnNameForStatus(task.status) }))
    return response(config, { ...structuredClone(sprint), colunas: structuredClone(demoColumns), cards })
  }
  const sprintStartMatch = path.match(/^\/sprints\/(\d+)\/iniciar$/)
  if (method === 'POST' && sprintStartMatch) {
    const sprint = database.sprints.find((item) => item.id === Number(sprintStartMatch[1]))
    if (!sprint) throw new Error('Sprint não encontrada no modo demonstração.')
    sprint.status = 'ATIVA'
    sprint.data_inicio = new Date().toISOString().slice(0, 10)
    const previousSprint = [...database.sprints]
      .filter((item) => item.projeto_id === sprint.projeto_id && item.status === 'ENCERRADA' && item.id !== sprint.id)
      .sort((a, b) => String(b.data_fim ?? '').localeCompare(String(a.data_fim ?? '')))[0]
    if (previousSprint) {
      database.tasks.forEach((task) => {
        if (task.sprint_id === previousSprint.id && task.status !== 'CONCLUIDO') {
          task.sprint_id = sprint.id
          if (task.status !== 'REVISAO') {
            task.status = 'TODO'
            task.coluna_id = 1
            task.coluna_nome = 'To do'
          }
        }
      })
    }
    saveDatabase()
    return response(config, structuredClone(sprint))
  }
  const sprintCloseMatch = path.match(/^\/sprints\/(\d+)\/encerrar$/)
  if (method === 'POST' && sprintCloseMatch) {
    const sprint = database.sprints.find((item) => item.id === Number(sprintCloseMatch[1]))
    if (!sprint) throw new Error('Sprint não encontrada no modo demonstração.')
    const payload = parsePayload<{ acao?: 'iniciar_planejada' | 'pausar'; proxima_sprint_id?: number; cards_para_backlog?: number[]; cards_para_sprint: number[] }>(config.data)
    database.sprintSnapshots[sprint.id] = structuredClone(database.tasks.filter((task) => task.sprint_id === sprint.id))
    sprint.status = 'ENCERRADA'
    sprint.data_fim = new Date().toISOString().slice(0, 10)
    let nextSprint: Sprint | null = null
    if ((payload.acao ?? 'iniciar_planejada') === 'iniciar_planejada') {
      nextSprint = database.sprints.find((item) => item.id === payload.proxima_sprint_id && item.status === 'PLANEJADA') ?? null
      nextSprint ??= database.sprints.find((item) => item.projeto_id === sprint.projeto_id && item.status === 'PLANEJADA') ?? null
      if (!nextSprint) {
        const projectSprints = database.sprints.filter((item) => item.projeto_id === sprint.projeto_id)
        const nextIndex = projectSprints.length + 1
        nextSprint = { id: nextId(database.sprints), nome: `Sprint ${String(nextIndex).padStart(2, '0')}`, status: 'PLANEJADA', projeto_id: sprint.projeto_id, criado_em: new Date().toISOString() }
        database.sprints.push(nextSprint)
      }
      nextSprint.status = 'ATIVA'
      nextSprint.data_inicio = new Date().toISOString().slice(0, 10)
      database.tasks.forEach((task) => {
        if (payload.cards_para_sprint.includes(task.id)) {
          task.sprint_id = nextSprint?.id
          if (task.status !== 'REVISAO') {
            task.status = 'TODO'
            task.coluna_id = 1
            task.coluna_nome = 'To do'
          }
        }
      })
    }
    database.tasks.forEach((task) => {
      if (payload.cards_para_backlog?.includes(task.id)) {
        task.sprint_id = undefined
        task.responsavel_id = undefined
        task.responsavel_nome = undefined
        task.due_date = undefined
        task.estimativa_consolidada = undefined
        task.pronto_para_estimativa = false
        task.status = 'BACKLOG'
      }
    })
    saveDatabase()
    return response(config, { id: sprint.id, status: sprint.status, proxima_sprint: nextSprint })
  }

  if (method === 'GET' && path === '/tasks') {
    const projectId = Number(url.searchParams.get('projeto_id')) || null
    const sprintId = Number(url.searchParams.get('sprint_id')) || null
    const status = url.searchParams.get('status') as TaskStatus | null
    const tasks = database.tasks.filter((task) =>
      (!projectId || task.projeto_id === projectId) &&
      (!sprintId || task.sprint_id === sprintId) &&
      (!status || task.status === status),
    )
    return response(config, structuredClone(tasks))
  }

  const projectBacklogMatch = path.match(/^\/projetos\/(\d+)\/backlog$/)
  if (method === 'GET' && projectBacklogMatch) return response(config, structuredClone(database.tasks.filter((task) => task.projeto_id === Number(projectBacklogMatch[1]) && !task.sprint_id)))

  const taskMatch = path.match(/^\/(?:tasks|cards)\/(\d+)$/)
  if (taskMatch) {
    const taskId = Number(taskMatch[1])
    const task = database.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    if (method === 'GET') return response(config, structuredClone(task))
    if (method === 'DELETE') {
      database.tasks = database.tasks.filter((item) => item.id !== taskId)
      database.comments = database.comments.filter((item) => item.task_id !== taskId)
      database.checklistItems = database.checklistItems.filter((item) => item.task_id !== taskId)
      saveDatabase()
      return response(config, null, 204)
    }
    if (method === 'PATCH') {
      const payload = parsePayload<Partial<Task> & { responsavel_id?: number | null; coluna_id?: number; sprint_id?: number | null; estimativa_consolidada?: number | null }>(config.data)
      if (!task.sprint_id && (payload.responsavel_id !== undefined || payload.due_date !== undefined || payload.estimativa_consolidada !== undefined || payload.coluna_id !== undefined)) {
        throw new Error('Cards no backlog são sugestões; responsável, prazo, estimativa e coluna só são definidos na sprint.')
      }
      Object.assign(task, payload)
      if (payload.due_date === 'SPRINT_ATUAL') {
        const sprint = database.sprints.find((item) => item.id === task.sprint_id)
        task.due_date = sprint?.data_inicio ?? new Date().toISOString().slice(0, 10)
      }
      if (payload.due_date === null) task.due_date = undefined
      if (payload.sprint_id === null) {
        task.sprint_id = undefined
        task.responsavel_id = undefined
        task.responsavel_nome = undefined
        task.due_date = undefined
        task.estimativa_consolidada = undefined
        task.pronto_para_estimativa = false
        task.status = 'BACKLOG'
      }
      if (payload.sprint_id) {
        task.sprint_id = payload.sprint_id
        task.coluna_id = 1
        task.coluna_nome = 'To do'
        task.status = 'TODO'
      }
      if (payload.coluna_id) {
        task.coluna_nome = demoColumns.find((column) => column.id === payload.coluna_id)?.nome
        task.status = ({ 1: 'TODO', 2: 'EM_ANDAMENTO', 3: 'REVISAO', 4: 'CONCLUIDO' } as const)[payload.coluna_id] ?? task.status
      }
      if (payload.responsavel_id === null) {
        task.responsavel_nome = undefined
      } else if (payload.responsavel_id) {
        const member = Object.values(database.members).flat().find((item) => item.id === payload.responsavel_id)
        task.responsavel_nome = member?.nome
      }
      if (payload.estimativa_consolidada) task.pronto_para_estimativa = false
      saveDatabase()
      return response(config, structuredClone(task))
    }
  }

  const markSeenMatch = path.match(/^\/(?:tasks|cards)\/(\d+)\/marcar-visto$/)
  if (method === 'POST' && markSeenMatch) {
    const task = database.tasks.find((item) => item.id === Number(markSeenMatch[1]))
    if (task) {
      task.tem_novidade = false
      task.novos_comentarios = false
      saveDatabase()
    }
    return response(config, { message: 'Card marcado como visto.' })
  }

  const commentsMatch = path.match(/^\/(?:tasks|cards)\/(\d+)\/comentarios$/)
  if (commentsMatch) {
    const taskId = Number(commentsMatch[1])
    if (method === 'GET') return response(config, structuredClone(database.comments.filter((comment) => comment.task_id === taskId)))
    if (method === 'POST') {
      const task = database.tasks.find((item) => item.id === taskId)
      if (!task?.sprint_id) throw new Error('Cards no backlog são sugestões; mova para uma sprint antes de comentar.')
      const payload = parsePayload<{ texto: string }>(config.data)
      const comment: Comentario = { id: nextId(database.comments), task_id: taskId, usuario_id: 3, usuario_nome: 'Carlos Dev', texto: payload.texto, criado_em: new Date().toISOString() }
      database.comments.push(comment)
      saveDatabase()
      return response(config, structuredClone(comment), 201)
    }
  }

  const commentDetailMatch = path.match(/^\/cards\/comentarios\/(\d+)$/)
  if (method === 'DELETE' && commentDetailMatch) {
    const commentId = Number(commentDetailMatch[1])
    database.comments = database.comments.filter((comment) => comment.id !== commentId)
    saveDatabase()
    return response(config, null, 204)
  }

  const commentAttachmentMatch = path.match(/^\/cards\/comentarios\/(\d+)\/anexos$/)
  if (method === 'POST' && commentAttachmentMatch) {
    const commentId = Number(commentAttachmentMatch[1])
    const comment = database.comments.find((item) => item.id === commentId)
    if (!comment) throw new Error('Comentário não encontrado no modo demonstração.')
    const file = config.data instanceof FormData ? config.data.get('arquivo') as File | null : null
    const nextAttachment = {
      id: Date.now(),
      nome: file?.name ?? 'anexo',
      url: file ? URL.createObjectURL(file) : '#',
      mime_type: file?.type,
    }
    comment.anexos = [...(comment.anexos ?? []), nextAttachment]
    saveDatabase()
    return response(config, nextAttachment, 201)
  }

  const historyMatch = path.match(/^\/cards\/(\d+)\/historico$/)
  if (historyMatch) {
    const taskId = Number(historyMatch[1])
    if (method === 'GET') return response(config, structuredClone(database.history.filter((item) => item.card_id === taskId)))
  }

  const validationMatch = path.match(/^\/cards\/(\d+)\/validacao$/)
  if (validationMatch) {
    const taskId = Number(validationMatch[1])
    database.validations[taskId] ??= []
    if (method === 'GET') return response(config, structuredClone(database.validations[taskId]))
    if (method === 'POST') {
      const task = database.tasks.find((item) => item.id === taskId)
      if (!task?.sprint_id) throw new Error('Cards no backlog são sugestões; mova para uma sprint antes de validar.')
      const payload = parsePayload<Pick<ValidacaoQA, 'resultado' | 'observacao'>>(config.data)
      const validation: ValidacaoQA = { id: nextId(database.validations[taskId]), resultado: payload.resultado, observacao: payload.observacao, qa_id: 4, qa_nome: 'Maria Santos', criado_em: new Date().toISOString() }
      database.validations[taskId].push(validation)
      database.history.push({ id: nextId(database.history), card_id: taskId, tipo: 'VALIDACAO_QA', detalhe: `Resultado: ${validation.resultado}`, usuario_id: 4, usuario_nome: 'Maria Santos', criado_em: validation.criado_em })
      saveDatabase()
      return response(config, structuredClone(validation), 201)
    }
  }

  const checklistMatch = path.match(/^\/(?:tasks\/(\d+)\/checklist|cards\/(\d+)\/checklists)$/)
  if (checklistMatch) {
    const taskId = Number(checklistMatch[1] ?? checklistMatch[2])
    if (method === 'GET') return response(config, [{ id: 1, titulo: 'Checklist do Desenvolvedor', itens: structuredClone(database.checklistItems.filter((item) => item.task_id === taskId).map((item) => ({ id: item.id, texto: item.titulo, concluido: item.concluido }))) }])
    if (method === 'POST') {
      const task = database.tasks.find((item) => item.id === taskId)
      if (!task?.sprint_id) throw new Error('Cards no backlog são sugestões; mova para uma sprint antes de editar checklist.')
      const payload = parsePayload<{ titulo: string }>(config.data)
      saveDatabase()
      return response(config, { id: 1, titulo: payload.titulo, itens: [] }, 201)
    }
  }

  const checklistCreateItemMatch = path.match(/^\/cards\/checklists\/(\d+)\/itens$/)
  if (method === 'POST' && checklistCreateItemMatch) {
    const payload = parsePayload<{ texto: string }>(config.data)
    const item: ChecklistItem = { id: nextId(database.checklistItems), task_id: 102, titulo: payload.texto, concluido: false }
    database.checklistItems.push(item)
    saveDatabase()
    return response(config, { id: item.id, texto: item.titulo, concluido: item.concluido }, 201)
  }

  const checklistItemMatch = path.match(/^\/(?:tasks\/checklist|cards\/checklists\/itens)\/(\d+)$/)
  if ((method === 'PATCH' || method === 'DELETE') && checklistItemMatch) {
    const item = database.checklistItems.find((entry) => entry.id === Number(checklistItemMatch[1]))
    if (!item) throw new Error('Item não encontrado no modo demonstração.')
    if (method === 'DELETE') {
      database.checklistItems = database.checklistItems.filter((entry) => entry.id !== item.id)
      saveDatabase()
      return response(config, null, 204)
    }
    Object.assign(item, parsePayload<Partial<ChecklistItem>>(config.data))
    saveDatabase()
    return response(config, structuredClone(item))
  }

  const estimateMatch = path.match(/^\/(?:tasks|cards)\/(\d+)\/estimativas$/)
  if (method === 'GET' && estimateMatch) {
    return response(config, {
      votantes: [{ usuario_id: 3, usuario_nome: 'Carlos Dev', votou: true }],
      votos_recebidos: [5],
      revelada: false,
    })
  }
  if (method === 'POST' && estimateMatch) {
    const task = database.tasks.find((item) => item.id === Number(estimateMatch[1]))
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    return response(config, { message: 'Voto registrado de forma privada.' }, 201)
  }

  const revealEstimateMatch = path.match(/^\/cards\/(\d+)\/estimativas\/revelar$/)
  if (method === 'POST' && revealEstimateMatch) {
    const task = database.tasks.find((item) => item.id === Number(revealEstimateMatch[1]))
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    const payload = parsePayload<{ estimativa_consolidada: number }>(config.data)
    task.estimativa_consolidada = payload.estimativa_consolidada
    task.pronto_para_estimativa = false
    saveDatabase()
    return response(config, { estimativa_consolidada: task.estimativa_consolidada, detail: 'Votos revelados.' })
  }

  const createCardMatch = path.match(/^\/projetos\/(\d+)\/cards$/)
  if (method === 'POST' && (path === '/tasks' || createCardMatch)) {
    const payload = parsePayload<{
      titulo: string
      descricao?: string
      prioridade?: Prioridade
      projeto_id?: number
      sprint_id?: number
      tipo?: Task['tipo']
      responsavel_id?: number
      responsavel_nome?: string
      due_date?: string
      estimativa_consolidada?: number
      pronto_para_estimativa?: boolean
      criterios_aceitacao?: string
      passos_reproducao?: string
      resultado_esperado?: string
      card_origem_id?: number
    }>(config.data)
    const id = nextId(database.tasks)
    if (!payload.sprint_id && (payload.responsavel_id || payload.due_date || payload.estimativa_consolidada || payload.pronto_para_estimativa)) {
      throw new Error('Cards no backlog são sugestões; responsável, prazo e estimativa só são definidos na sprint.')
    }
    const task: Task = {
      id,
      codigo: shortCode(id),
      titulo: payload.titulo,
      descricao: payload.descricao,
      prioridade: payload.prioridade ?? 'MEDIA',
      projeto_id: createCardMatch ? Number(createCardMatch[1]) : payload.projeto_id,
      sprint_id: payload.sprint_id,
      tipo: payload.tipo ?? 'TAREFA',
      responsavel_id: payload.responsavel_id,
      responsavel_nome: payload.responsavel_nome,
      due_date: payload.due_date === 'SPRINT_ATUAL' ? database.sprints.find((sprint) => sprint.id === payload.sprint_id)?.data_inicio ?? new Date().toISOString().slice(0, 10) : payload.due_date,
      estimativa_consolidada: payload.estimativa_consolidada,
      pronto_para_estimativa: payload.pronto_para_estimativa,
      criterios_aceitacao: payload.criterios_aceitacao,
      passos_reproducao: payload.passos_reproducao,
      resultado_esperado: payload.resultado_esperado,
      card_origem_id: payload.card_origem_id,
      status: payload.sprint_id ? 'TODO' : 'BACKLOG',
      criado_em: new Date().toISOString(),
    }
    database.tasks.unshift(task)
    saveDatabase()
    return response(config, structuredClone(task), 201)
  }

  const cardDetailMatch = path.match(/^\/cards\/(\d+)$/)
  if (cardDetailMatch) {
    const task = database.tasks.find((item) => item.id === Number(cardDetailMatch[1]))
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    if (method === 'GET') return response(config, structuredClone(task))
    if (method === 'PATCH') {
      const payload = parsePayload<Partial<Task> & { responsavel_id?: number | null; coluna_id?: number; estimativa_consolidada?: number | null }>(config.data)
      Object.assign(task, payload)
      if (payload.coluna_id) {
        task.coluna_nome = demoColumns.find((column) => column.id === payload.coluna_id)?.nome
        task.status = ({ 1: 'TODO', 2: 'EM_ANDAMENTO', 3: 'REVISAO', 4: 'CONCLUIDO' } as const)[payload.coluna_id] ?? task.status
      }
      if (payload.responsavel_id === null) {
        task.responsavel_nome = undefined
      } else if (payload.responsavel_id) {
        const member = Object.values(database.members).flat().find((item) => item.id === payload.responsavel_id)
        task.responsavel_nome = member?.nome
      }
      if (payload.estimativa_consolidada) task.pronto_para_estimativa = false
      saveDatabase()
      return response(config, structuredClone(task))
    }
  }

  const projectMatch = path.match(/^\/(?:admin\/)?projetos\/(\d+)$/)
  if (projectMatch) {
    const projectId = Number(projectMatch[1])
    const project = database.projects.find((item) => item.id === projectId)
    if (!project) throw new Error('Projeto não encontrado no modo demonstração.')
    if (method === 'PATCH') {
      Object.assign(project, parsePayload<Partial<Projeto>>(config.data))
      saveDatabase()
      return response(config, structuredClone(project))
    }
    if (method === 'DELETE') {
      database.projects = database.projects.filter((item) => item.id !== projectId)
      database.sprints = database.sprints.filter((item) => item.projeto_id !== projectId)
      database.tasks = database.tasks.filter((item) => item.projeto_id !== projectId)
      saveDatabase()
      return response(config, null, 204)
    }
  }

  if (method === 'POST' && (path === '/projetos' || path === '/admin/projetos')) {
    const payload = parsePayload<Pick<Projeto, 'nome' | 'descricao'> & { gerente_id?: number }>(config.data)
    const project: Projeto = { id: nextId(database.projects), nome: payload.nome, descricao: payload.descricao, criado_em: new Date().toISOString(), status: 'ATIVO', member_count: 1 }
    database.projects.unshift(project)
    const gerente = usersFromMembers().find((user) => user.id === payload.gerente_id)
    database.members[project.id] = gerente ? [{ id: gerente.id, nome: gerente.nome, email: gerente.email, cargo: 'GERENTE' }] : []
    saveDatabase()
    return response(config, structuredClone(project), 201)
  }

  if (method === 'GET' && path === '/mfa/status') return response(config, { mfa_ativo: database.mfa.active, mfa_tipo: database.mfa.type })
  if (method === 'GET' && path === '/auth/bootstrap-status') return response(config, { bootstrap_disponivel: true })
  if (method === 'POST' && path === '/auth/bootstrap-admin') return response(config, { id: 1, nome: 'Admin Demonstração', email: 'admin@empresa.com', admin: true }, 201)
  if (method === 'GET' && path === '/auth/convite-info') return response(config, { email: 'colaborador@empresa.com', admin: false })
  if (method === 'POST' && path === '/auth/ativar-convite') return response(config, { message: 'Conta ativada no modo demonstração.' }, 201)
  if (method === 'POST' && path === '/mfa/setup/totp') return response(config, { secret: 'LAZULI-DEMO-SECRET', qrcode: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZB1sAAAAASUVORK5CYII=', uri: 'otpauth://totp/Lazuli:demo' })
  if (method === 'POST' && path === '/mfa/setup/email') return response(config, { message: 'Código de demonstração enviado.' })
  if (method === 'POST' && (path === '/mfa/verify/totp' || path === '/mfa/verify/email')) {
    database.mfa = { active: true, type: path.endsWith('totp') ? 'TOTP' : 'EMAIL' }
    saveDatabase()
    return response(config, { message: 'MFA ativado no modo demonstração.' })
  }
  if (method === 'DELETE' && path === '/mfa/disable') {
    database.mfa = { active: false, type: null }
    saveDatabase()
    return response(config, { message: 'MFA desativado no modo demonstração.' })
  }

  throw new Error(`Rota não simulada: ${method} ${path}`)
}

export const demoAdapter: AxiosAdapter = (config) => handleRequest(config)
