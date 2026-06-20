import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import type { CardType, Prioridade, ProjectMember } from '@/types'

interface CreateCardModalProps {
  projetoId: number
  sprintId?: number
  mode?: 'backlog' | 'sprint'
  onClose: () => void
  onSuccess: () => void
}

const initialForm = {
  titulo: '', descricao: '', prioridade: 'BAIXA' as Prioridade, tipo: 'TAREFA' as CardType,
  responsavelId: '', dueDate: '', estimate: '', criterios: '', passosReproducao: '', resultadoEsperado: '',
}

export default function CreateCardModal({ projetoId, sprintId, mode = sprintId ? 'sprint' : 'backlog', onClose, onSuccess }: CreateCardModalProps) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isSprintCard = mode === 'sprint' && Boolean(sprintId)
  const { data: members = [] } = useQuery({ queryKey: ['project-members', projetoId], queryFn: () => api.get<ProjectMember[]>(`/projetos/${projetoId}/membros/`).then((response) => response.data) })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.titulo.trim()) return setError('Título obrigatório')
    setLoading(true)
    setError('')
    const responsible = members.find((member) => member.id === Number(form.responsavelId))
    try {
      await api.post(`/projetos/${projetoId}/cards/`, {
        titulo: form.titulo.trim(), descricao: form.descricao,
        prioridade: isSprintCard ? form.prioridade : undefined,
        tipo: form.tipo,
        sprint_id: isSprintCard ? sprintId : undefined,
        responsavel_id: isSprintCard ? responsible?.id : undefined,
        due_date: isSprintCard ? form.dueDate || undefined : undefined,
        estimativa_consolidada: isSprintCard && form.estimate && form.estimate !== 'POKER' ? Number(form.estimate) : undefined,
        pronto_para_estimativa: isSprintCard && form.estimate === 'POKER',
        criterios_aceitacao: form.criterios, passos_reproducao: form.passosReproducao, resultado_esperado: form.resultadoEsperado,
      })
      onSuccess()
      onClose()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao criar task'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-8 py-6"><DialogTitle>Criar Novo Card</DialogTitle><DialogDescription className="sr-only">Preencha os dados do novo card.</DialogDescription></DialogHeader>
        <form className="flex min-h-0 flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-5 overflow-y-auto px-8 py-6">
            {error && <Alert variant="destructive">{error}</Alert>}
            <Field label="Título *"><Input value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} placeholder="Ex: Implementar tela de login" autoFocus /></Field>
            <Field label="Descrição"><Textarea className="min-h-28" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Detalhes sobre a atividade..." /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              {isSprintCard && <Field label="Prioridade"><Select value={form.prioridade} onChange={(event) => setForm({ ...form, prioridade: event.target.value as Prioridade })}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></Select></Field>}
              <Field label="Tipo"><Select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as CardType })}><option value="TAREFA">Task</option><option value="BUG">Bug</option></Select></Field>
            </div>
            {isSprintCard && (
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Responsável"><Select value={form.responsavelId} onChange={(event) => setForm({ ...form, responsavelId: event.target.value })}><option value="">Não atribuído</option>{members.map((member) => <option key={member.id} value={member.id}>{member.nome}</option>)}</Select></Field>
                <Field label="Prazo"><Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
                <Field label="Estimativa"><Select value={form.estimate} onChange={(event) => setForm({ ...form, estimate: event.target.value })}><option value="">Não estimada</option><option value="POKER">Definir por Planning Poker</option>{[1, 2, 3, 5, 8, 13, 21].map((value) => <option key={value} value={value}>{value} pontos</option>)}</Select></Field>
              </div>
            )}
            <Field label="Critérios de Aceitação"><Textarea className="min-h-24 font-mono" value={form.criterios} onChange={(event) => setForm({ ...form, criterios: event.target.value })} placeholder={'- Botão de login na tela principal\n- Redirecionamento correto...'} /></Field>
            {form.tipo === 'BUG' && <div className="grid gap-5 sm:grid-cols-2"><Field label="Passos para reprodução"><Textarea value={form.passosReproducao} onChange={(event) => setForm({ ...form, passosReproducao: event.target.value })} /></Field><Field label="Resultado esperado"><Textarea value={form.resultadoEsperado} onChange={(event) => setForm({ ...form, resultadoEsperado: event.target.value })} /></Field></div>}
          </div>
          <DialogFooter className="border-t border-border bg-muted px-8 py-5"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Card'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
