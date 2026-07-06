import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Prioridade, ProjectMember } from '@/types'
import { Field } from './Primitives'
import type { EditCardFormState } from './types'

export function EditCardForm({ form, members, isBacklog, isSaving, error, onChange, onSave }: { form: EditCardFormState; members: ProjectMember[]; isBacklog: boolean; isSaving: boolean; error: string; onChange: (form: EditCardFormState) => void; onSave: () => void }) {
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
