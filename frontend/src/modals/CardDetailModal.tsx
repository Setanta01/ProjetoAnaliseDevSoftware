import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, Bookmark, Bug, CheckCircle2, Clock3, Pencil, Paperclip, Plus, Trash2, X, XCircle } from 'lucide-react'
import api from '@/api'
import { Alert } from '@/components/ui/alert'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import EstimateDifficultyModal from '@/modals/EstimateDifficultyModal'
import { isBacklogCard } from '@/lib/card-rules'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { apiBaseUrl } from '@/lib/env'
import type { CardHistorico, ChecklistItem, Comentario, Prioridade, ProjectMember, ProjectRole, Task, ValidacaoQA } from '@/types'

type ActivityTab = 'comments' | 'subtasks' | 'history'

interface CardDetailModalProps { cardId: number | null; canManage?: boolean; currentUserId?: number; currentRole?: ProjectRole | 'ADMIN'; onClose: () => void }

export default function CardDetailModal({ cardId, canManage = false, currentUserId, currentRole, onClose }: CardDetailModalProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ActivityTab>('comments')
  const [comment, setComment] = useState('')
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([])
  const [commentAttachments, setCommentAttachments] = useState<File[]>([])
  const [newItem, setNewItem] = useState('')
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingItemText, setEditingItemText] = useState('')
  const [qaObservation, setQaObservation] = useState('')
  const [bugForm, setBugForm] = useState({ titulo: '', passos: '', resultadoEsperado: '' })
  const [showEstimate, setShowEstimate] = useState(false)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')
  const [qaError, setQaError] = useState('')
  const [editForm, setEditForm] = useState({ titulo: '', descricao: '', criteriosAceitacao: '', prioridade: 'MEDIA' as Prioridade, responsavelId: '', dueDate: '', estimate: '' })
  const { data: task, isLoading } = useQuery({ queryKey: ['task', cardId], queryFn: () => api.get<Task>(`/cards/${cardId}/`).then((response) => response.data), enabled: Boolean(cardId), refetchOnMount: 'always' })
  const { data: members = [] } = useQuery({ queryKey: ['project-members', task?.projeto_id], queryFn: () => api.get<ProjectMember[]>(`/projetos/${task?.projeto_id}/membros/`).then((response) => response.data), enabled: Boolean(task?.projeto_id) })
  const { data: comments = [] } = useQuery({ queryKey: ['task-comments', cardId], queryFn: () => api.get<ApiComment[]>(`/cards/${cardId}/comentarios/`).then((response) => response.data.map(normalizeComment)), enabled: Boolean(cardId) })
  const { data: checklist = [] } = useQuery({ queryKey: ['task-checklist', cardId], queryFn: () => api.get<ApiChecklist[]>(`/cards/${cardId}/checklists/`).then((response) => response.data.flatMap((checklistGroup) => checklistGroup.itens.map((item) => ({ id: item.id, task_id: cardId ?? 0, titulo: item.texto, concluido: item.concluido })))), enabled: Boolean(cardId) })
  const { data: history = [] } = useQuery({ queryKey: ['task-history', cardId], queryFn: () => api.get<CardHistorico[]>(`/cards/${cardId}/historico/`).then((response) => response.data), enabled: Boolean(cardId) })
  const { data: validations = [] } = useQuery({ queryKey: ['task-validations', cardId], queryFn: () => api.get<ValidacaoQA[]>(`/cards/${cardId}/validacao/`).then((response) => response.data), enabled: Boolean(cardId) })

  const editing = Boolean(cardId && editingCardId === cardId)
  const isBacklog = task ? isBacklogCard(task) : false
  const canEditCard = canManage || (currentRole === 'QA' && task?.tipo === 'BUG') || currentRole === 'ADMIN'
  const isReviewCard = task?.status === 'REVISAO'
  const canValidateQA = isReviewCard && (currentRole === 'QA' || currentRole === 'ADMIN')
  const currentUserName = members.find((member) => member.id === currentUserId)?.nome ?? 'Usuário'
  const latestValidation = validations.at(-1)
  const saveCardMutation = useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Card não selecionado.')
      const payload: CardPatchPayload = {
        titulo: editForm.titulo.trim(),
        descricao: editForm.descricao,
        criterios_aceitacao: editForm.criteriosAceitacao,
        prioridade: editForm.prioridade,
      }
      if (!isBacklog) {
        payload.responsavel_id = editForm.responsavelId ? Number(editForm.responsavelId) : null
        payload.estimativa_consolidada = editForm.estimate ? Number(editForm.estimate) : null
      }
      if (!isBacklog && task && editForm.dueDate !== (task.due_date ? 'SPRINT_ATUAL' : '')) {
        payload.due_date = editForm.dueDate || null
        payload.justificativa_prazo = 'Ajuste feito pelo gerente no detalhe do card.'
      }
      return api.patch<Task>(`/cards/${cardId}/`, payload).then((response) => response.data)
    },
    onMutate: () => {
      setSaveError('')
    },
    onSuccess: async () => {
      setEditingCardId(null)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['board'] }),
        queryClient.invalidateQueries({ queryKey: ['backlog'] }),
      ])
    },
    onError: (error) => {
      setSaveError(getErrorMessage(error, 'Não foi possível salvar as alterações do card.'))
    },
  })
  const assignToMeMutation = useMutation({
    mutationFn: () => {
      if (!cardId || !currentUserId) throw new Error('Usuário ou card não selecionado.')
      return api.patch<Task>(`/cards/${cardId}/`, { responsavel_id: currentUserId }).then((response) => response.data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['board'] }),
        queryClient.invalidateQueries({ queryKey: ['backlog'] }),
      ])
    },
  })
  const moveToBacklogMutation = useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Card não selecionado.')
      return api.patch<Task>(`/cards/${cardId}/`, { sprint_id: null }).then((response) => response.data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['board'] }),
        queryClient.invalidateQueries({ queryKey: ['backlog'] }),
      ])
    },
  })
  const validateQaMutation = useMutation({
    mutationFn: (payload: { resultado: ValidacaoQA['resultado']; observacao: string }) => {
      if (!cardId) throw new Error('Card não selecionado.')
      return api.post<ValidacaoQA>(`/cards/${cardId}/validacao/`, payload).then((response) => response.data)
    },
    onMutate: () => setQaError(''),
    onSuccess: async () => {
      setQaObservation('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-validations', cardId] }),
        queryClient.invalidateQueries({ queryKey: ['task-history', cardId] }),
        queryClient.invalidateQueries({ queryKey: ['board'] }),
      ])
    },
    onError: (error) => setQaError(getErrorMessage(error, 'Não foi possível registrar a validação.')),
  })
  const createBugMutation = useMutation({
    mutationFn: () => {
      if (!task?.projeto_id) throw new Error('Projeto não encontrado.')
      return api.post<Task>(`/projetos/${task.projeto_id}/cards/`, {
        titulo: bugForm.titulo.trim() || `Bug: ${task.titulo}`,
        descricao: qaObservation.trim() || latestValidation?.observacao || `Bug gerado a partir da validação do card ${task.codigo ?? `#${task.id}`}.`,
        prioridade: task.prioridade,
        tipo: 'BUG',
        sprint_id: task.sprint_id,
        responsavel_id: task.responsavel_id,
        passos_reproducao: bugForm.passos.trim(),
        resultado_esperado: bugForm.resultadoEsperado.trim(),
        card_origem_id: task.id,
      }).then((response) => response.data)
    },
    onMutate: () => setQaError(''),
    onSuccess: async () => {
      setBugForm({ titulo: '', passos: '', resultadoEsperado: '' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['board'] }),
        queryClient.invalidateQueries({ queryKey: ['backlog'] }),
        queryClient.invalidateQueries({ queryKey: ['task-history', cardId] }),
      ])
    },
    onError: (error) => setQaError(getErrorMessage(error, 'Não foi possível criar o bug da reprovação.')),
  })

  const addComment = async () => {
    if (!cardId || !comment.trim()) return
    const created = await api.post<ApiComment>(`/cards/${cardId}/comentarios/`, { texto: comment.trim(), mencionados_ids: mentionedUserIds }).then((response) => response.data)
    if (commentAttachments.length) {
      await Promise.all(commentAttachments.map((file) => {
        const formData = new FormData()
        formData.append('arquivo', file)
        return api.post(`/cards/comentarios/${created.id}/anexos/`, formData)
      }))
    }
    setComment('')
    setMentionedUserIds([])
    setCommentAttachments([])
    await queryClient.invalidateQueries({ queryKey: ['task-comments', cardId] })
  }

  const deleteComment = async (commentId: number) => {
    await api.delete(`/cards/comentarios/${commentId}/`)
    await queryClient.invalidateQueries({ queryKey: ['task-comments', cardId] })
  }

  const addMention = (memberId: string) => {
    const id = Number(memberId)
    if (!id || mentionedUserIds.includes(id)) return
    setMentionedUserIds((current) => [...current, id])
  }

  const addAttachments = (files: FileList | null) => {
    if (!files?.length) return
    setCommentAttachments((current) => [...current, ...Array.from(files)])
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

  const updateItemText = async (item: ChecklistItem) => {
    if (!editingItemText.trim()) return
    await api.patch(`/cards/checklists/itens/${item.id}/`, { texto: editingItemText.trim() })
    setEditingItemId(null)
    setEditingItemText('')
    await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] })
  }

  const deleteItem = async (item: ChecklistItem) => {
    await api.delete(`/cards/checklists/itens/${item.id}/`)
    await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] })
  }

  const saveCard = () => {
    if (!editForm.titulo.trim()) {
      setSaveError('Título é obrigatório.')
      return
    }
    saveCardMutation.mutate()
  }

  const validateQa = (resultado: ValidacaoQA['resultado']) => {
    const observacao = qaObservation.trim()
    if (resultado === 'REPROVADO' && !observacao) {
      setQaError('Informe uma observação para reprovar o card.')
      return
    }
    validateQaMutation.mutate({ resultado, observacao })
  }

  const createBugFromQa = () => {
    createBugMutation.mutate()
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
                <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><Bookmark className="h-4 w-4 text-muted-foreground" /><Badge variant="id">{task.codigo ?? `#${task.id}`}</Badge></div><div className="flex items-center gap-2">{canEditCard && <Button size="sm" variant="outline" onClick={() => { setSaveError(''); if (editing) { setEditingCardId(null); return } setEditForm(formFromTask(task)); setEditingCardId(task.id) }}>{editing ? 'Cancelar edição' : 'Editar'}</Button>}{canManage && task.sprint_id && <Button size="sm" variant="secondary" disabled={moveToBacklogMutation.isPending} onClick={() => moveToBacklogMutation.mutate()}>{moveToBacklogMutation.isPending ? 'Movendo...' : 'Mover para backlog'}</Button>}<Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button></div></div>
                <h2 className="mb-8 text-2xl font-bold leading-tight text-card-foreground">{task.titulo}</h2>
                {editing && <EditCardForm form={editForm} members={members} isBacklog={isBacklog} isSaving={saveCardMutation.isPending} error={saveError} onChange={setEditForm} onSave={saveCard} />}
                <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-7">
                  <Meta label="Status"><Badge variant="info">• {statusLabel(task.status)}</Badge></Meta>
                  <Meta label="Prioridade"><span className="font-semibold text-primary">⌃ {priorityLabel(task.prioridade)}</span></Meta>
                  <Meta label="Responsável">{isBacklog ? <span className="text-muted-foreground">Definido ao entrar na sprint</span> : task.responsavel_nome ? <span className="flex items-center gap-2 font-semibold"><UserAvatar name={task.responsavel_nome} className="h-8 w-8" />{task.responsavel_nome}</span> : <span className="flex flex-wrap items-center gap-2 text-muted-foreground">Não atribuído{currentUserId && <Button size="sm" variant="outline" disabled={assignToMeMutation.isPending} onClick={() => assignToMeMutation.mutate()}>{assignToMeMutation.isPending ? 'Assumindo...' : 'Assumir task'}</Button>}</span>}</Meta>
                  <Meta label="Estimativa"><div className="flex items-center gap-3">{isBacklog ? <span className="text-muted-foreground">Definida na sprint</span> : task.estimativa_consolidada ? <><strong>{task.estimativa_consolidada} Pontos</strong>{canManage && <Button size="sm" variant="secondary" className="text-primary" onClick={() => setShowEstimate(true)}>Alterar</Button>}</> : task.pronto_para_estimativa ? <Button size="sm" variant="secondary" className="text-primary" onClick={() => setShowEstimate(true)}>{canManage ? 'Fechar Planning Poker' : 'Estimar dificuldade'}</Button> : canManage ? <Button size="sm" variant="secondary" className="text-primary" onClick={() => setShowEstimate(true)}>Definir estimativa</Button> : <span className="text-muted-foreground">Não estimada</span>}</div></Meta>
                </div>
                <DetailSection title="Descrição"><p>{task.descricao || 'Sem descrição.'}</p></DetailSection>
                {task.criterios_aceitacao && <DetailSection title="Critérios de aceitação"><ul className="list-disc space-y-2 pl-5">{task.criterios_aceitacao.split('\n').filter(Boolean).map((line) => <li key={line}>{line.replace(/^-\s*/, '')}</li>)}</ul></DetailSection>}
                {task.tipo === 'BUG' && task.passos_reproducao && <DetailSection title="Passos para reprodução"><p>{task.passos_reproducao}</p></DetailSection>}
                {task.tipo === 'BUG' && task.resultado_esperado && <DetailSection title="Resultado esperado"><p>{task.resultado_esperado}</p></DetailSection>}
                {task.tipo === 'BUG' && task.card_origem_id && <DetailSection title="Origem"><p>Bug criado a partir do card #{task.card_origem_id}.</p></DetailSection>}
                {Boolean(task.bugs_gerados?.length) && <DetailSection title="Bugs gerados"><div className="space-y-2">{task.bugs_gerados?.map((bug) => <div key={bug.id} className="rounded-md border border-border bg-muted p-3 text-sm"><span className="font-semibold text-card-foreground">{bug.codigo ?? `#${bug.id}`}</span> <span>{bug.titulo}</span>{bug.status && <Badge variant="neutral" className="ml-2">{statusLabel(bug.status)}</Badge>}</div>)}</div></DetailSection>}
                {!isBacklog && (latestValidation || isReviewCard) && <QaPanel canValidate={canValidateQA} latestValidation={latestValidation} observation={qaObservation} bugForm={bugForm} isSaving={validateQaMutation.isPending || createBugMutation.isPending} error={qaError} onObservationChange={setQaObservation} onBugFormChange={setBugForm} onValidate={validateQa} onCreateBug={createBugFromQa} />}
              </section>

              <section className="flex min-h-0 flex-col border-l border-border bg-muted">
                <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5"><h3 className="text-lg font-bold">Atividade</h3><div className="flex gap-7"><Tab active={tab === 'comments'} onClick={() => setTab('comments')}>Comentários</Tab><Tab active={tab === 'subtasks'} onClick={() => setTab('subtasks')}>Subtarefas</Tab><Tab active={tab === 'history'} onClick={() => setTab('history')}>Histórico</Tab></div></div>
                <div className="flex-1 overflow-y-auto p-8">
                  {tab === 'comments' ? <CommentList comments={comments} currentUserId={currentUserId} canManage={canManage} onDelete={deleteComment} /> : tab === 'subtasks' ? <Checklist items={checklist} progress={progress} readOnly={isBacklog} editingItemId={editingItemId} editingItemText={editingItemText} onEditingTextChange={setEditingItemText} onEditStart={(item) => { setEditingItemId(item.id); setEditingItemText(item.titulo) }} onEditCancel={() => { setEditingItemId(null); setEditingItemText('') }} onEditSave={updateItemText} onDelete={deleteItem} onToggle={toggleItem} /> : <HistoryList history={history} validations={validations} />}
                </div>
                {!isBacklog && tab !== 'history' && <div className="border-t border-border bg-card p-4">
                  <div className="flex gap-3"><UserAvatar name={currentUserName} className="h-9 w-9" /><div className="flex-1 overflow-hidden rounded-xl border border-input bg-card"><Textarea className="min-h-20 resize-none border-0 shadow-none focus-visible:ring-0" value={tab === 'comments' ? comment : newItem} onChange={(event) => tab === 'comments' ? setComment(event.target.value) : setNewItem(event.target.value)} placeholder={tab === 'comments' ? 'Adicionar um comentário...' : 'Adicionar novo item ao checklist...'} />{tab === 'comments' && (mentionedUserIds.length > 0 || commentAttachments.length > 0) && <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">{mentionedUserIds.map((id) => { const member = members.find((item) => item.id === id); return <button key={id} type="button" className="rounded-md bg-secondary px-2 py-1 hover:bg-secondary/80" onClick={() => setMentionedUserIds((current) => current.filter((item) => item !== id))}>@{member?.nome ?? id}</button> })}{commentAttachments.map((file) => <button key={`${file.name}-${file.size}`} type="button" className="rounded-md bg-secondary px-2 py-1 hover:bg-secondary/80" onClick={() => setCommentAttachments((current) => current.filter((item) => item !== file))}>{file.name}</button>)}</div>}<div className="flex items-center justify-between border-t border-border bg-muted px-3 py-2"><div className="flex items-center gap-2 text-muted-foreground">{tab === 'comments' ? <><Select className="h-8 w-40 bg-card" value="" onChange={(event) => addMention(event.target.value)} aria-label="Mencionar usuário"><option value="">@ Mencionar</option>{members.filter((member) => !mentionedUserIds.includes(member.id)).map((member) => <option key={member.id} value={member.id}>{member.nome}</option>)}</Select><input id={`comment-attachments-${cardId ?? 'new'}`} className="sr-only" type="file" multiple accept="image/*,video/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => addAttachments(event.target.files)} /><Button type="button" variant="ghost" size="sm" asChild><label htmlFor={`comment-attachments-${cardId ?? 'new'}`}><Paperclip className="h-4 w-4" /> Anexar</label></Button></> : <><AtSign className="h-4 w-4" /><Paperclip className="h-4 w-4" /></>}</div><Button size="sm" onClick={() => void (tab === 'comments' ? addComment() : addItem())}>{tab === 'comments' ? 'Salvar' : <><Plus className="h-4 w-4" /> Adicionar</>}</Button></div></div></div>
                </div>}
              </section>
            </div>
            {!isBacklog && <EstimateDifficultyModal task={task} open={showEstimate} canManage={canManage} onOpenChange={setShowEstimate} onDone={() => { void queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }) }} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

type EditCardFormState = {
  titulo: string
  descricao: string
  criteriosAceitacao: string
  prioridade: Prioridade
  responsavelId: string
  dueDate: string
  estimate: string
}

type CardPatchPayload = {
  titulo: string
  descricao: string
  criterios_aceitacao: string
  prioridade: Prioridade
  responsavel_id?: number | null
  due_date?: string | null
  estimativa_consolidada?: number | null
  justificativa_prazo?: string
}

function formFromTask(task: Task): EditCardFormState {
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

function EditCardForm({ form, members, isBacklog, isSaving, error, onChange, onSave }: { form: EditCardFormState; members: ProjectMember[]; isBacklog: boolean; isSaving: boolean; error: string; onChange: (form: EditCardFormState) => void; onSave: () => void }) {
  return (
    <div className="mb-8 space-y-4 rounded-lg border border-border bg-muted p-4">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título"><Input value={form.titulo} onChange={(event) => onChange({ ...form, titulo: event.target.value })} /></Field>
        <Field label="Prioridade"><Select value={form.prioridade} onChange={(event) => onChange({ ...form, prioridade: event.target.value as Prioridade })}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></Select></Field>
      </div>
      <Field label="Descrição"><Textarea className="min-h-24" value={form.descricao} onChange={(event) => onChange({ ...form, descricao: event.target.value })} /></Field>
      <Field label="Critérios de aceitação"><Textarea className="min-h-24" value={form.criteriosAceitacao} onChange={(event) => onChange({ ...form, criteriosAceitacao: event.target.value })} placeholder="- Critério esperado" /></Field>
      {!isBacklog && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsável"><Select value={form.responsavelId} onChange={(event) => onChange({ ...form, responsavelId: event.target.value })}><option value="">Não atribuído</option>{members.map((member) => <option key={member.id} value={member.id}>{member.nome}</option>)}</Select></Field>
        <Field label="Entrega"><Select value={form.dueDate} onChange={(event) => onChange({ ...form, dueDate: event.target.value })}><option value="SPRINT_ATUAL">Atrelada à sprint atual</option><option value="">Sem entrega atrelada à sprint</option></Select></Field>
        <Field label="Estimativa"><Select value={form.estimate} onChange={(event) => onChange({ ...form, estimate: event.target.value })}><option value="">Não estimada</option>{[1, 2, 3, 5, 8, 13, 21].map((value) => <option key={value} value={value}>{value} pontos</option>)}</Select></Field>
      </div>}
      <div className="flex justify-end"><Button type="button" disabled={isSaving} onClick={onSave}>{isSaving ? 'Salvando...' : 'Salvar alterações'}</Button></div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function Meta({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><div className="text-sm text-card-foreground">{children}</div></div> }
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-7"><h3 className="mb-3 border-b border-border pb-3 text-sm font-bold">{title}</h3><div className="text-sm leading-relaxed text-muted-foreground">{children}</div></section> }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={cn('border-b-2 py-1 text-sm font-semibold', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')} onClick={onClick}>{children}</button> }

function CommentList({ comments, currentUserId, canManage, onDelete }: { comments: Comentario[]; currentUserId?: number; canManage: boolean; onDelete: (commentId: number) => Promise<void> }) {
  if (!comments.length) return <p className="text-sm text-muted-foreground">Nenhum comentário registrado.</p>
  const orderedComments = [...comments].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  return <div className="space-y-4">{orderedComments.map((comment) => {
    const canDelete = canManage || comment.usuario_id === currentUserId
    return <div key={comment.id} className="flex gap-3"><UserAvatar name={comment.usuario_nome} className="h-8 w-8" /><div className="flex-1"><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><p><strong>{comment.usuario_nome}</strong> <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(comment.criado_em)}</span></p>{canDelete && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-danger-muted hover:text-destructive" aria-label="Remover comentário" onClick={() => void onDelete(comment.id)}><Trash2 className="h-4 w-4" /></Button>}</div><div className="rounded-lg border border-border bg-card p-3 text-sm leading-relaxed text-card-foreground shadow-sm"><p>{comment.texto}</p>{Boolean(comment.anexos?.length) && <div className="mt-2 flex flex-wrap gap-2">{comment.anexos?.map((anexo) => <AttachmentLink key={anexo.id} anexo={anexo} />)}</div>}</div></div></div>
  })}</div>
}

function AttachmentLink({ anexo }: { anexo: NonNullable<Comentario['anexos']>[number] }) {
  const href = attachmentUrl(anexo.url)
  const isImage = anexo.mime_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(anexo.nome)
  return <a href={href} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80" title="Abrir anexo">{isImage ? <img src={href} alt="" className="h-8 w-8 rounded object-cover" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{anexo.nome}</span></a>
}

function Checklist({ items, progress, readOnly, editingItemId, editingItemText, onEditingTextChange, onEditStart, onEditCancel, onEditSave, onDelete, onToggle }: { items: ChecklistItem[]; progress: number; readOnly: boolean; editingItemId: number | null; editingItemText: string; onEditingTextChange: (value: string) => void; onEditStart: (item: ChecklistItem) => void; onEditCancel: () => void; onEditSave: (item: ChecklistItem) => Promise<void>; onDelete: (item: ChecklistItem) => Promise<void>; onToggle: (item: ChecklistItem) => Promise<void> }) {
  return <div><div className="mb-4"><h4 className="font-bold">Checklist do Desenvolvedor</h4></div><div className="space-y-3">{items.map((item) => {
    const editing = editingItemId === item.id
    return <div key={item.id} className={cn('rounded-lg border bg-card p-3 shadow-sm', !item.concluido && 'border-primary/30')}><div className="flex items-center gap-3"><Checkbox checked={item.concluido} disabled={readOnly} onCheckedChange={() => void onToggle(item)} />{editing ? <Input value={editingItemText} onChange={(event) => onEditingTextChange(event.target.value)} autoFocus /> : <span className={cn('flex-1 text-sm', item.concluido && 'text-muted-foreground line-through')}>{item.titulo}</span>}{!readOnly && <><Button type="button" variant="ghost" size="icon" onClick={() => editing ? void onEditSave(item) : onEditStart(item)} aria-label={editing ? 'Salvar item' : 'Editar item'}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-muted hover:text-destructive" onClick={() => void onDelete(item)} aria-label="Remover item"><Trash2 className="h-4 w-4" /></Button></>}</div>{editing && <div className="mt-3 flex justify-end"><Button type="button" size="sm" variant="outline" onClick={onEditCancel}>Cancelar</Button></div>}</div>
  })}</div><Progress value={progress} className="mt-5" /><p className="mt-3 text-right text-xs text-muted-foreground">{progress}% Concluído</p></div>
}

function statusLabel(status: Task['status']) { return { BACKLOG: 'Backlog', TODO: 'A Fazer', EM_ANDAMENTO: 'Em Progresso', REVISAO: 'Revisão', CONCLUIDO: 'Concluído', BLOQUEADO: 'Bloqueado' }[status] }
function priorityLabel(priority: Task['prioridade']) { return { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }[priority] }
function formatDateTime(value: string) { return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '') }
function attachmentUrl(value: string) {
  if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value
  const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, '')
  return `${backendOrigin}${value.startsWith('/') ? value : `/${value}`}`
}

function QaPanel({ canValidate, latestValidation, observation, bugForm, isSaving, error, onObservationChange, onBugFormChange, onValidate, onCreateBug }: { canValidate: boolean; latestValidation?: ValidacaoQA; observation: string; bugForm: { titulo: string; passos: string; resultadoEsperado: string }; isSaving: boolean; error: string; onObservationChange: (value: string) => void; onBugFormChange: (value: { titulo: string; passos: string; resultadoEsperado: string }) => void; onValidate: (resultado: ValidacaoQA['resultado']) => void; onCreateBug: () => void }) {
  return (
    <section className="mb-7 rounded-lg border border-border bg-muted p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Validação</h3>
        {latestValidation && <Badge variant={latestValidation.resultado === 'APROVADO' ? 'success' : 'danger'}>{latestValidation.resultado === 'APROVADO' ? 'Aprovado' : 'Reprovado'}</Badge>}
      </div>
      {latestValidation ? <p className="mb-4 text-sm text-muted-foreground">Última validação por {latestValidation.qa_nome ?? 'QA'} em {formatDateTime(latestValidation.criado_em)}{latestValidation.observacao ? `: ${latestValidation.observacao}` : '.'}</p> : <p className="mb-4 text-sm text-muted-foreground">Nenhuma validação registrada ainda.</p>}
      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      {canValidate && (
        <div className="space-y-4">
          <Textarea className="min-h-20" value={observation} onChange={(event) => onObservationChange(event.target.value)} placeholder="Observação da validação..." />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={isSaving} onClick={() => onValidate('APROVADO')}><CheckCircle2 className="h-4 w-4" /> Aprovar</Button>
            <Button type="button" size="sm" variant="destructive" disabled={isSaving} onClick={() => onValidate('REPROVADO')}><XCircle className="h-4 w-4" /> Reprovar</Button>
          </div>
          {latestValidation?.resultado === 'REPROVADO' && <div className="rounded-md border border-border bg-card p-3">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Bug className="h-4 w-4" /> Bug da reprovação</p>
            <div className="space-y-3">
              <Input value={bugForm.titulo} onChange={(event) => onBugFormChange({ ...bugForm, titulo: event.target.value })} placeholder="Título do bug (opcional)" />
              <Textarea value={bugForm.passos} onChange={(event) => onBugFormChange({ ...bugForm, passos: event.target.value })} placeholder="Passos para reprodução" />
              <Textarea value={bugForm.resultadoEsperado} onChange={(event) => onBugFormChange({ ...bugForm, resultadoEsperado: event.target.value })} placeholder="Resultado esperado" />
              <Button type="button" size="sm" variant="secondary" disabled={isSaving} onClick={onCreateBug}>Criar bug vinculado</Button>
            </div>
          </div>}
        </div>
      )}
    </section>
  )
}

function HistoryList({ history, validations }: { history: CardHistorico[]; validations: ValidacaoQA[] }) {
  const validationItems = validations.map((validation) => ({
    id: `qa-${validation.id}`,
    createdAt: validation.criado_em,
    user: validation.qa_nome ?? 'QA',
    text: `registrou validação: ${validation.resultado === 'APROVADO' ? 'aprovado' : 'reprovado'}${validation.observacao ? ` - ${validation.observacao}` : ''}`,
    icon: validation.resultado === 'APROVADO' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />,
  }))
  const historyItems = history.map((item) => ({
    id: `h-${item.id}`,
    createdAt: item.criado_em,
    user: item.usuario_nome ?? 'Sistema',
    text: historyText(item),
    icon: <Clock3 className="h-3.5 w-3.5" />,
  }))
  const items = [...historyItems, ...validationItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
  return <div className="space-y-5">{items.map((item) => <div key={item.id} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">{item.icon}</span><p><strong>{item.user}</strong> {item.text}<span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span></p></div>)}</div>
}

function historyText(item: CardHistorico) {
  const typeLabel: Record<string, string> = {
    CRIACAO: 'criou o card',
    MUDANCA_COLUNA: 'moveu o card',
    MUDANCA_RESPONSAVEL: 'alterou o responsável',
    MUDANCA_SPRINT: 'alterou a sprint',
    VALIDACAO_QA: 'registrou validação',
    IMPEDIMENTO: 'marcou impedimento',
    IMPEDIMENTO_REMOVIDO: 'removeu impedimento',
  }
  const base = typeLabel[item.tipo] ?? item.tipo.toLowerCase().replaceAll('_', ' ')
  return item.detalhe ? `${base}: ${item.detalhe}` : base
}

interface ApiComment {
  id: number
  texto: string
  usuario_id?: number
  usuario_nome?: string
  autor_id?: number
  autor_nome?: string
  criado_em: string
  editado_em?: string
  anexos?: Array<{ id: number; nome: string; url: string; mime_type?: string }>
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
    anexos: comment.anexos ?? [],
  }
}
