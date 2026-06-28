import { Bug, CheckCircle2, Clock3, Paperclip, Pencil, Trash2, XCircle } from 'lucide-react'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { CardHistorico, ChecklistItem, Comentario, ValidacaoQA } from '@/types'
import { attachmentUrl, formatDateTime } from './helpers'

export function CommentList({ comments, currentUserId, canManage, onDelete }: { comments: Comentario[]; currentUserId?: number; canManage: boolean; onDelete: (commentId: number) => Promise<void> }) {
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

export function Checklist({ items, progress, readOnly, editingItemId, editingItemText, onEditingTextChange, onEditStart, onEditCancel, onEditSave, onDelete, onToggle }: { items: ChecklistItem[]; progress: number; readOnly: boolean; editingItemId: number | null; editingItemText: string; onEditingTextChange: (value: string) => void; onEditStart: (item: ChecklistItem) => void; onEditCancel: () => void; onEditSave: (item: ChecklistItem) => Promise<void>; onDelete: (item: ChecklistItem) => Promise<void>; onToggle: (item: ChecklistItem) => Promise<void> }) {
  return <div><div className="mb-4"><h4 className="font-bold">Checklist do Desenvolvedor</h4></div><div className="space-y-3">{items.map((item) => {
    const editing = editingItemId === item.id
    return <div key={item.id} className={cn('rounded-lg border bg-card p-3 shadow-sm', !item.concluido && 'border-primary/30')}><div className="flex items-center gap-3"><Checkbox checked={item.concluido} disabled={readOnly} onCheckedChange={() => void onToggle(item)} />{editing ? <Input value={editingItemText} onChange={(event) => onEditingTextChange(event.target.value)} autoFocus /> : <span className={cn('flex-1 text-sm', item.concluido && 'text-muted-foreground line-through')}>{item.titulo}</span>}{!readOnly && <><Button type="button" variant="ghost" size="icon" onClick={() => editing ? void onEditSave(item) : onEditStart(item)} aria-label={editing ? 'Salvar item' : 'Editar item'}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-muted hover:text-destructive" onClick={() => void onDelete(item)} aria-label="Remover item"><Trash2 className="h-4 w-4" /></Button></>}</div>{editing && <div className="mt-3 flex justify-end"><Button type="button" size="sm" variant="outline" onClick={onEditCancel}>Cancelar</Button></div>}</div>
  })}</div><Progress value={progress} className="mt-5" /><p className="mt-3 text-right text-xs text-muted-foreground">{progress}% Concluído</p></div>
}

export function QaPanel({ canValidate, latestValidation, observation, bugForm, isSaving, error, onObservationChange, onBugFormChange, onValidate, onCreateBug }: { canValidate: boolean; latestValidation?: ValidacaoQA; observation: string; bugForm: { titulo: string; passos: string; resultadoEsperado: string }; isSaving: boolean; error: string; onObservationChange: (value: string) => void; onBugFormChange: (value: { titulo: string; passos: string; resultadoEsperado: string }) => void; onValidate: (resultado: ValidacaoQA['resultado']) => void; onCreateBug: () => void }) {
  return (
    <section className="mb-7 rounded-lg border border-border bg-muted p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Validação</h3>
        {latestValidation && <Badge variant={latestValidation.resultado === 'APROVADO' ? 'success' : 'danger'}>{latestValidation.resultado === 'APROVADO' ? 'Aprovado' : 'Reprovado'}</Badge>}
      </div>
      {latestValidation ? <p className="mb-4 text-sm text-muted-foreground">Última validação por {latestValidation.qa_nome ?? 'QA'} em {formatDateTime(latestValidation.criado_em)}{latestValidation.observacao ? `: ${latestValidation.observacao}` : '.'}</p> : <p className="mb-4 text-sm text-muted-foreground">Nenhuma validação registrada ainda.</p>}
      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      {canValidate && <div className="space-y-4">
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
      </div>}
    </section>
  )
}

export function HistoryList({ history, validations }: { history: CardHistorico[]; validations: ValidacaoQA[] }) {
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
