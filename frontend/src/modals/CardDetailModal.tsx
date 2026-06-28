import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, X } from 'lucide-react'
import api from '@/api'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import EstimateDifficultyModal from '@/modals/EstimateDifficultyModal'
import { Checklist, CommentList, HistoryList, QaPanel } from '@/modals/card-detail/ActivitySections'
import { ActivityComposer } from '@/modals/card-detail/ActivityComposer'
import { EditCardForm } from '@/modals/card-detail/EditCardForm'
import { DetailSection, Meta, Tab } from '@/modals/card-detail/Primitives'
import { formFromTask, normalizeComment, priorityLabel, statusLabel } from '@/modals/card-detail/helpers'
import type { ActivityTab, ApiChecklist, ApiComment, CardPatchPayload, EditCardFormState } from '@/modals/card-detail/types'
import { isBacklogCard } from '@/lib/card-rules'
import { getErrorMessage } from '@/lib/errors'
import type { CardHistorico, ChecklistItem, ProjectMember, ProjectRole, Task, ValidacaoQA } from '@/types'

interface CardDetailModalProps {
  cardId: number | null
  canManage?: boolean
  currentUserId?: number
  currentRole?: ProjectRole | 'ADMIN'
  onClose: () => void
}

const emptyEditForm: EditCardFormState = {
  titulo: '',
  descricao: '',
  criteriosAceitacao: '',
  prioridade: 'MEDIA',
  responsavelId: '',
  dueDate: '',
  estimate: '',
}

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
  const [editForm, setEditForm] = useState<EditCardFormState>(emptyEditForm)

  const { data: task, isLoading } = useQuery({ queryKey: ['task', cardId], queryFn: () => api.get<Task>(`/cards/${cardId}/`).then((response) => response.data), enabled: Boolean(cardId), refetchOnMount: 'always' })
  const { data: members = [] } = useQuery({ queryKey: ['project-members', task?.projeto_id], queryFn: () => api.get<ProjectMember[]>(`/projetos/${task?.projeto_id}/membros/`).then((response) => response.data), enabled: Boolean(task?.projeto_id) })
  const { data: comments = [] } = useQuery({ queryKey: ['task-comments', cardId], queryFn: () => api.get<ApiComment[]>(`/cards/${cardId}/comentarios/`).then((response) => response.data.map(normalizeComment)), enabled: Boolean(cardId) })
  const { data: checklist = [] } = useQuery({ queryKey: ['task-checklist', cardId], queryFn: () => api.get<ApiChecklist[]>(`/cards/${cardId}/checklists/`).then((response) => response.data.flatMap((group) => group.itens.map((item) => ({ id: item.id, task_id: cardId ?? 0, titulo: item.texto, concluido: item.concluido })))), enabled: Boolean(cardId) })
  const { data: history = [] } = useQuery({ queryKey: ['task-history', cardId], queryFn: () => api.get<CardHistorico[]>(`/cards/${cardId}/historico/`).then((response) => response.data), enabled: Boolean(cardId) })
  const { data: validations = [] } = useQuery({ queryKey: ['task-validations', cardId], queryFn: () => api.get<ValidacaoQA[]>(`/cards/${cardId}/validacao/`).then((response) => response.data), enabled: Boolean(cardId) })

  const editing = Boolean(cardId && editingCardId === cardId)
  const isBacklog = task ? isBacklogCard(task) : false
  const canEditCard = canManage || (currentRole === 'QA' && task?.tipo === 'BUG') || currentRole === 'ADMIN'
  const isReviewCard = task?.status === 'REVISAO'
  const canValidateQA = isReviewCard && (currentRole === 'QA' || currentRole === 'ADMIN')
  const currentUserName = members.find((member) => member.id === currentUserId)?.nome ?? 'Usuário'
  const latestValidation = validations.at(-1)
  const completed = checklist.filter((item) => item.concluido).length
  const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0

  const invalidateCardData = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['backlog'] }),
    ])
  }

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
    onMutate: () => setSaveError(''),
    onSuccess: async () => {
      setEditingCardId(null)
      await invalidateCardData()
    },
    onError: (error) => setSaveError(getErrorMessage(error, 'Não foi possível salvar as alterações do card.')),
  })

  const assignToMeMutation = useMutation({
    mutationFn: () => {
      if (!cardId || !currentUserId) throw new Error('Usuário ou card não selecionado.')
      return api.patch<Task>(`/cards/${cardId}/`, { responsavel_id: currentUserId }).then((response) => response.data)
    },
    onSuccess: invalidateCardData,
  })

  const moveToBacklogMutation = useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Card não selecionado.')
      return api.patch<Task>(`/cards/${cardId}/`, { sprint_id: null }).then((response) => response.data)
    },
    onSuccess: invalidateCardData,
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
    await Promise.all(commentAttachments.map((file) => {
      const formData = new FormData()
      formData.append('arquivo', file)
      return api.post(`/cards/comentarios/${created.id}/anexos/`, formData)
    }))
    setComment('')
    setMentionedUserIds([])
    setCommentAttachments([])
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

  const saveCard = () => {
    if (!editForm.titulo.trim()) return setSaveError('Título é obrigatório.')
    saveCardMutation.mutate()
  }

  const validateQa = (resultado: ValidacaoQA['resultado']) => {
    const observacao = qaObservation.trim()
    if (resultado === 'REPROVADO' && !observacao) return setQaError('Informe uma observação para reprovar o card.')
    validateQaMutation.mutate({ resultado, observacao })
  }

  return (
    <Dialog open={Boolean(cardId)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent hideClose className="h-[85vh] max-h-[880px] max-w-6xl gap-0 overflow-hidden p-0">
        {isLoading || !task ? <div className="flex h-full items-center justify-center text-muted-foreground">Carregando...</div> : (
          <>
            <DialogTitle className="sr-only">Detalhes do card {task.codigo}</DialogTitle>
            <DialogDescription className="sr-only">Detalhes, comentários e subtarefas do card.</DialogDescription>
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
                {!isBacklog && (latestValidation || isReviewCard) && <QaPanel canValidate={canValidateQA} latestValidation={latestValidation} observation={qaObservation} bugForm={bugForm} isSaving={validateQaMutation.isPending || createBugMutation.isPending} error={qaError} onObservationChange={setQaObservation} onBugFormChange={setBugForm} onValidate={validateQa} onCreateBug={() => createBugMutation.mutate()} />}
              </section>
              <section className="flex min-h-0 flex-col border-l border-border bg-muted">
                <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5"><h3 className="text-lg font-bold">Atividade</h3><div className="flex gap-7"><Tab active={tab === 'comments'} onClick={() => setTab('comments')}>Comentários</Tab><Tab active={tab === 'subtasks'} onClick={() => setTab('subtasks')}>Subtarefas</Tab><Tab active={tab === 'history'} onClick={() => setTab('history')}>Histórico</Tab></div></div>
                <div className="flex-1 overflow-y-auto p-8">
                  {tab === 'comments' ? <CommentList comments={comments} currentUserId={currentUserId} canManage={canManage} onDelete={async (commentId) => { await api.delete(`/cards/comentarios/${commentId}/`); await queryClient.invalidateQueries({ queryKey: ['task-comments', cardId] }) }} /> : tab === 'subtasks' ? <Checklist items={checklist} progress={progress} readOnly={isBacklog} editingItemId={editingItemId} editingItemText={editingItemText} onEditingTextChange={setEditingItemText} onEditStart={(item) => { setEditingItemId(item.id); setEditingItemText(item.titulo) }} onEditCancel={() => { setEditingItemId(null); setEditingItemText('') }} onEditSave={async (item: ChecklistItem) => { if (!editingItemText.trim()) return; await api.patch(`/cards/checklists/itens/${item.id}/`, { texto: editingItemText.trim() }); setEditingItemId(null); setEditingItemText(''); await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] }) }} onDelete={async (item) => { await api.delete(`/cards/checklists/itens/${item.id}/`); await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] }) }} onToggle={async (item) => { await api.patch(`/cards/checklists/itens/${item.id}/`, { concluido: !item.concluido }); await queryClient.invalidateQueries({ queryKey: ['task-checklist', cardId] }) }} /> : <HistoryList history={history} validations={validations} />}
                </div>
                {!isBacklog && tab !== 'history' && <ActivityComposer tab={tab} cardId={cardId} currentUserName={currentUserName} members={members} comment={comment} newItem={newItem} mentionedUserIds={mentionedUserIds} commentAttachments={commentAttachments} onCommentChange={setComment} onNewItemChange={setNewItem} onMentionedUserIdsChange={setMentionedUserIds} onAttachmentsChange={setCommentAttachments} onSubmit={() => void (tab === 'comments' ? addComment() : addItem())} />}
              </section>
            </div>
            {!isBacklog && <EstimateDifficultyModal task={task} open={showEstimate} canManage={canManage} onOpenChange={setShowEstimate} onDone={() => { void queryClient.refetchQueries({ queryKey: ['task', cardId], type: 'active' }) }} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
