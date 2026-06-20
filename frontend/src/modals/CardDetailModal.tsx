import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, Bookmark, Paperclip, Plus, X } from 'lucide-react'
import api from '@/api'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import EstimateDifficultyModal from '@/modals/EstimateDifficultyModal'
import { cn } from '@/lib/utils'
import type { ChecklistItem, Comentario, Task } from '@/types'

type ActivityTab = 'comments' | 'subtasks'

interface CardDetailModalProps { cardId: number | null; onClose: () => void }

export default function CardDetailModal({ cardId, onClose }: CardDetailModalProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ActivityTab>('comments')
  const [comment, setComment] = useState('')
  const [newItem, setNewItem] = useState('')
  const [showEstimate, setShowEstimate] = useState(false)
  const { data: task, isLoading } = useQuery({ queryKey: ['task', cardId], queryFn: () => api.get<Task>(`/cards/${cardId}/`).then((response) => response.data), enabled: Boolean(cardId) })
  const { data: comments = [] } = useQuery({ queryKey: ['task-comments', cardId], queryFn: () => api.get<ApiComment[]>(`/cards/${cardId}/comentarios/`).then((response) => response.data.map(normalizeComment)), enabled: Boolean(cardId) })
  const { data: checklist = [] } = useQuery({ queryKey: ['task-checklist', cardId], queryFn: () => api.get<ApiChecklist[]>(`/cards/${cardId}/checklists/`).then((response) => response.data.flatMap((checklistGroup) => checklistGroup.itens.map((item) => ({ id: item.id, task_id: cardId ?? 0, titulo: item.texto, concluido: item.concluido })))), enabled: Boolean(cardId) })

  const addComment = async () => {
    if (!cardId || !comment.trim()) return
    await api.post(`/cards/${cardId}/comentarios/`, { texto: comment.trim() })
    setComment('')
    await queryClient.invalidateQueries({ queryKey: ['task-comments', cardId] })
  }

  const addItem = async () => {
    if (!cardId || !newItem.trim()) return
    const checklists = await api.get<ApiChecklist[]>(`/cards/${cardId}/checklists/`).then((response) => response.data)
    const checklistId = checklists[0]?.id ?? await api.post<ApiChecklist>(`/cards/${cardId}/checklists/`, { titulo: 'Checklist do Desenvolvedor' }).then((response) => response.data.id)
    await api.post(`/cards/checklists/${checklistId}/itens/`, { texto: newItem.trim() })
    setNewItem('')
    await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] })
  }

  const toggleItem = async (item: ChecklistItem) => {
    await api.patch(`/cards/checklists/itens/${item.id}/`, { concluido: !item.concluido })
    await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] })
  }

  const completed = checklist.filter((item) => item.concluido).length
  const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0

  return (
    <Dialog open={Boolean(cardId)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent hideClose className="h-[85vh] max-h-[880px] max-w-6xl gap-0 overflow-hidden p-0">
        {isLoading || !task ? <div className="flex h-full items-center justify-center text-muted-foreground">Carregando...</div> : (
          <>
            <DialogTitle className="sr-only">Detalhes do card {task.codigo}</DialogTitle><DialogDescription className="sr-only">Detalhes, comentários e subtarefas do card.</DialogDescription>
            <div className="grid h-full min-h-0 md:grid-cols-2">
              <section className="overflow-y-auto bg-card p-8">
                <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><Bookmark className="h-4 w-4 text-muted-foreground" /><Badge variant="id">{task.codigo ?? `#${task.id}`}</Badge></div><Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button></div>
                <h2 className="mb-8 text-2xl font-bold leading-tight text-card-foreground">{task.titulo}</h2>
                <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-7">
                  <Meta label="Status"><Badge variant="info">• {statusLabel(task.status)}</Badge></Meta>
                  <Meta label="Prioridade"><span className="font-semibold text-primary">⌃ {priorityLabel(task.prioridade)}</span></Meta>
                  <Meta label="Responsável">{task.responsavel_nome ? <span className="flex items-center gap-2 font-semibold"><UserAvatar name={task.responsavel_nome} className="h-8 w-8" />{task.responsavel_nome}</span> : <span className="text-muted-foreground">Não atribuído</span>}</Meta>
                  <Meta label="Estimativa"><div className="flex items-center gap-3">{task.estimativa_consolidada ? <strong>{task.estimativa_consolidada} Pontos</strong> : task.pronto_para_estimativa ? <Button size="sm" variant="secondary" className="text-primary" onClick={() => setShowEstimate(true)}>Estimar dificuldade</Button> : <span className="text-muted-foreground">Não estimada</span>}</div></Meta>
                </div>
                <DetailSection title="Descrição"><p>{task.descricao || 'Sem descrição.'}</p></DetailSection>
                {task.criterios_aceitacao && <DetailSection title="Critérios de aceitação"><ul className="list-disc space-y-2 pl-5">{task.criterios_aceitacao.split('\n').filter(Boolean).map((line) => <li key={line}>{line.replace(/^-\s*/, '')}</li>)}</ul></DetailSection>}
                {task.tipo === 'BUG' && task.passos_reproducao && <DetailSection title="Passos para reprodução"><p>{task.passos_reproducao}</p></DetailSection>}
              </section>

              <section className="flex min-h-0 flex-col border-l border-border bg-muted">
                <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5"><h3 className="text-lg font-bold">Atividade</h3><div className="flex gap-7"><Tab active={tab === 'comments'} onClick={() => setTab('comments')}>Comentários</Tab><Tab active={tab === 'subtasks'} onClick={() => setTab('subtasks')}>Subtarefas</Tab></div></div>
                <div className="flex-1 overflow-y-auto p-8">
                  {tab === 'comments' ? <CommentList comments={comments} /> : <Checklist items={checklist} progress={progress} onToggle={toggleItem} />}
                </div>
                <div className="border-t border-border bg-card p-5">
                  <div className="flex gap-3"><UserAvatar name="Carlos Dev" className="h-9 w-9" /><div className="flex-1 overflow-hidden rounded-xl border border-input bg-card"><Textarea className="min-h-20 resize-none border-0 shadow-none focus-visible:ring-0" value={tab === 'comments' ? comment : newItem} onChange={(event) => tab === 'comments' ? setComment(event.target.value) : setNewItem(event.target.value)} placeholder={tab === 'comments' ? 'Adicionar um comentário...' : 'Adicionar novo item ao checklist...'} /><div className="flex items-center justify-between border-t border-border bg-muted px-3 py-2"><div className="flex gap-3 text-muted-foreground"><AtSign className="h-4 w-4" /><Paperclip className="h-4 w-4" /></div><Button size="sm" onClick={() => void (tab === 'comments' ? addComment() : addItem())}>{tab === 'comments' ? 'Salvar' : <><Plus className="h-4 w-4" /> Adicionar</>}</Button></div></div></div>
                </div>
              </section>
            </div>
            <EstimateDifficultyModal task={task} open={showEstimate} onOpenChange={setShowEstimate} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><div className="text-sm text-card-foreground">{children}</div></div> }
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-7"><h3 className="mb-3 border-b border-border pb-3 text-sm font-bold">{title}</h3><div className="text-sm leading-relaxed text-muted-foreground">{children}</div></section> }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={cn('border-b-2 py-1 text-sm font-semibold', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')} onClick={onClick}>{children}</button> }

function CommentList({ comments }: { comments: Comentario[] }) {
  return <div className="space-y-7"><div className="flex gap-3 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground">↻</span><p><strong>Maria Santos</strong> alterou o status para <Badge variant="info">Em Progresso</Badge><span className="mt-1 block text-xs text-muted-foreground">Hoje às 09:15</span></p></div>{comments.map((comment) => <div key={comment.id} className="flex gap-3"><UserAvatar name={comment.usuario_nome} /><div className="flex-1"><p className="mb-2 text-sm"><strong>{comment.usuario_nome}</strong> <span className="ml-2 text-xs text-muted-foreground">{formatTime(comment.criado_em)}</span></p><div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-card-foreground shadow-sm">{comment.texto}</div></div></div>)}</div>
}

function Checklist({ items, progress, onToggle }: { items: ChecklistItem[]; progress: number; onToggle: (item: ChecklistItem) => Promise<void> }) {
  return <div><div className="mb-4 flex items-center justify-between"><h4 className="font-bold">Checklist do Desenvolvedor</h4><span className="text-sm text-primary">Adicionar item</span></div><div className="space-y-3">{items.map((item) => <label key={item.id} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-4 shadow-sm', !item.concluido && 'border-primary/30')}><Checkbox checked={item.concluido} onCheckedChange={() => void onToggle(item)} /><span className={cn('text-sm', item.concluido && 'text-muted-foreground line-through')}>{item.titulo}</span></label>)}</div><Progress value={progress} className="mt-5" /><p className="mt-3 text-right text-xs text-muted-foreground">{progress}% Concluído</p></div>
}

function statusLabel(status: Task['status']) { return { BACKLOG: 'Backlog', TODO: 'A Fazer', EM_ANDAMENTO: 'Em Progresso', REVISAO: 'Revisão', CONCLUIDO: 'Concluído', BLOQUEADO: 'Bloqueado' }[status] }
function priorityLabel(priority: Task['prioridade']) { return { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }[priority] }
function formatTime(value: string) { return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }

interface ApiComment {
  id: number
  texto: string
  usuario_id?: number
  usuario_nome?: string
  autor_id?: number
  autor_nome?: string
  criado_em: string
  editado_em?: string
}

interface ApiChecklist {
  id: number
  titulo: string
  itens: Array<{ id: number; texto: string; concluido: boolean }>
}

function normalizeComment(comment: ApiComment): Comentario {
  return {
    id: comment.id,
    task_id: 0,
    usuario_id: comment.usuario_id ?? comment.autor_id ?? 0,
    usuario_nome: comment.usuario_nome ?? comment.autor_nome ?? 'Usuário',
    texto: comment.texto,
    criado_em: comment.criado_em,
    editado_em: comment.editado_em,
  }
}
