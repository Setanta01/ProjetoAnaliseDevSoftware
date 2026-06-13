import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createDemoDatabase, type DemoDatabase } from '@/demo/data'
import type { ChecklistItem, Comentario, Prioridade, Projeto, Task, TaskStatus } from '@/types'

const STORAGE_KEY = 'lazuli_demo_database_v2'
const DEMO_DELAY_MS = 180

function loadDatabase(): DemoDatabase {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return createDemoDatabase()
  try {
    return JSON.parse(saved) as DemoDatabase
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

async function handleRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, DEMO_DELAY_MS))
  const method = config.method?.toUpperCase() ?? 'GET'
  const url = new URL(config.url ?? '/', 'http://lazuli.demo')
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/'

  if (method === 'GET' && path === '/projetos') return response(config, structuredClone(database.projects.filter((project) => project.meu_cargo)))
  if (method === 'GET' && path === '/admin/projetos') return response(config, structuredClone(database.projects))
  if (method === 'GET' && path === '/sprints') return response(config, structuredClone(database.sprints))

  const projectDetailMatch = path.match(/^\/projetos\/(\d+)$/)
  if (method === 'GET' && projectDetailMatch) {
    const project = database.projects.find((item) => item.id === Number(projectDetailMatch[1]))
    if (!project) throw new Error('Projeto não encontrado no modo demonstração.')
    return response(config, structuredClone(project))
  }

  const projectSprintsMatch = path.match(/^\/projetos\/(\d+)\/sprints$/)
  if (method === 'GET' && projectSprintsMatch) return response(config, structuredClone(database.sprints.filter((sprint) => sprint.projeto_id === Number(projectSprintsMatch[1]))))

  const projectMembersMatch = path.match(/^\/projetos\/(\d+)\/membros$/)
  if (method === 'GET' && projectMembersMatch) return response(config, structuredClone(database.members[Number(projectMembersMatch[1])] ?? []))

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

  const taskMatch = path.match(/^\/tasks\/(\d+)$/)
  if (taskMatch) {
    const taskId = Number(taskMatch[1])
    const task = database.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    if (method === 'GET') return response(config, structuredClone(task))
    if (method === 'PATCH') {
      const payload = parsePayload<Partial<Pick<Task, 'titulo' | 'descricao' | 'status' | 'prioridade'>>>(config.data)
      Object.assign(task, payload)
      saveDatabase()
      return response(config, structuredClone(task))
    }
  }

  const markSeenMatch = path.match(/^\/tasks\/(\d+)\/marcar-visto$/)
  if (method === 'POST' && markSeenMatch) {
    const task = database.tasks.find((item) => item.id === Number(markSeenMatch[1]))
    if (task) {
      task.tem_novidade = false
      task.novos_comentarios = false
      saveDatabase()
    }
    return response(config, { message: 'Card marcado como visto.' })
  }

  const commentsMatch = path.match(/^\/tasks\/(\d+)\/comentarios$/)
  if (commentsMatch) {
    const taskId = Number(commentsMatch[1])
    if (method === 'GET') return response(config, structuredClone(database.comments.filter((comment) => comment.task_id === taskId)))
    if (method === 'POST') {
      const payload = parsePayload<{ texto: string }>(config.data)
      const comment: Comentario = { id: nextId(database.comments), task_id: taskId, usuario_id: 3, usuario_nome: 'Carlos Dev', texto: payload.texto, criado_em: new Date().toISOString() }
      database.comments.push(comment)
      saveDatabase()
      return response(config, structuredClone(comment), 201)
    }
  }

  const checklistMatch = path.match(/^\/tasks\/(\d+)\/checklist$/)
  if (checklistMatch) {
    const taskId = Number(checklistMatch[1])
    if (method === 'GET') return response(config, structuredClone(database.checklistItems.filter((item) => item.task_id === taskId)))
    if (method === 'POST') {
      const payload = parsePayload<{ titulo: string }>(config.data)
      const item: ChecklistItem = { id: nextId(database.checklistItems), task_id: taskId, titulo: payload.titulo, concluido: false }
      database.checklistItems.push(item)
      saveDatabase()
      return response(config, structuredClone(item), 201)
    }
  }

  const checklistItemMatch = path.match(/^\/tasks\/checklist\/(\d+)$/)
  if (method === 'PATCH' && checklistItemMatch) {
    const item = database.checklistItems.find((entry) => entry.id === Number(checklistItemMatch[1]))
    if (!item) throw new Error('Item não encontrado no modo demonstração.')
    Object.assign(item, parsePayload<Partial<ChecklistItem>>(config.data))
    saveDatabase()
    return response(config, structuredClone(item))
  }

  const estimateMatch = path.match(/^\/tasks\/(\d+)\/estimativas$/)
  if (method === 'POST' && estimateMatch) {
    const task = database.tasks.find((item) => item.id === Number(estimateMatch[1]))
    if (!task) throw new Error('Task não encontrada no modo demonstração.')
    return response(config, { message: 'Voto registrado de forma privada.' }, 201)
  }

  if (method === 'POST' && path === '/tasks') {
    const payload = parsePayload<{
      titulo: string
      descricao?: string
      prioridade: Prioridade
      projeto_id: number
      sprint_id?: number
      tipo?: Task['tipo']
      responsavel_id?: number
      responsavel_nome?: string
      due_date?: string
      estimativa_consolidada?: number
      criterios_aceitacao?: string
    }>(config.data)
    const id = nextId(database.tasks)
    const task: Task = {
      id,
      codigo: `ALF-${id}`,
      titulo: payload.titulo,
      descricao: payload.descricao,
      prioridade: payload.prioridade,
      projeto_id: payload.projeto_id,
      sprint_id: payload.sprint_id,
      tipo: payload.tipo ?? 'TAREFA',
      responsavel_id: payload.responsavel_id,
      responsavel_nome: payload.responsavel_nome,
      due_date: payload.due_date,
      estimativa_consolidada: payload.estimativa_consolidada,
      criterios_aceitacao: payload.criterios_aceitacao,
      status: payload.sprint_id ? 'TODO' : 'BACKLOG',
      criado_em: new Date().toISOString(),
    }
    database.tasks.unshift(task)
    saveDatabase()
    return response(config, structuredClone(task), 201)
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
    const payload = parsePayload<Pick<Projeto, 'nome' | 'descricao'>>(config.data)
    const project: Projeto = { id: nextId(database.projects), ...payload, criado_em: new Date().toISOString(), status: 'ATIVO' }
    database.projects.unshift(project)
    saveDatabase()
    return response(config, structuredClone(project), 201)
  }

  if (method === 'GET' && path === '/mfa/status') return response(config, { mfa_ativo: database.mfa.active, mfa_tipo: database.mfa.type })
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
