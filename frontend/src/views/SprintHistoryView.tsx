import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Play, Plus, SquareCheckBig } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/errors'
import type { Sprint, SprintDetail } from '@/types'

export default function SprintHistoryView({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [error, setError] = useState('')
  const { data: sprints = [], isLoading } = useQuery({ queryKey: ['project-sprints', projectId], queryFn: () => api.get<Sprint[]>(`/projetos/${projectId}/sprints/`).then((response) => response.data) })
  const activeSprint = sprints.find((sprint) => sprint.status === 'ATIVA')
  const plannedSprint = sprints.find((sprint) => sprint.status === 'PLANEJADA')
  const history = sprints.filter((sprint) => sprint.status === 'ENCERRADA')

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['board'] }),
    ])
  }

  const startSprint = async (sprint: Sprint) => {
    setError('')
    try {
      await api.post(`/sprints/${sprint.id}/iniciar/`)
      await refresh()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao iniciar sprint.'))
    }
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader title="Sprints" subtitle="Controle o ciclo atual e acompanhe entregas encerradas." actions={canManage ? <Button onClick={() => setCreateOpen(true)} disabled={Boolean(plannedSprint)}><Plus className="h-4 w-4" /> Nova Sprint</Button> : undefined} />
      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <DataPanel title="Sprint ativa">{isLoading ? <LoadingState /> : activeSprint ? <div className="space-y-4 p-4"><div><Badge variant="info">Ativa</Badge><h2 className="mt-3 text-lg font-bold">{activeSprint.nome}</h2><p className="text-sm text-muted-foreground">Iniciada em {formatDate(activeSprint.data_inicio)}</p></div>{canManage && <Button variant="outline" onClick={() => setCloseOpen(true)}><SquareCheckBig className="h-4 w-4" /> Encerrar Sprint</Button>}</div> : <EmptyState message="Nenhuma sprint ativa." />}</DataPanel>
        <DataPanel title="Sprint planejada">{isLoading ? <LoadingState /> : plannedSprint ? <div className="space-y-4 p-4"><div><Badge variant="planning">Planejada</Badge><h2 className="mt-3 text-lg font-bold">{plannedSprint.nome}</h2></div>{canManage && <Button onClick={() => void startSprint(plannedSprint)}><Play className="h-4 w-4" /> Iniciar Sprint</Button>}</div> : <EmptyState message="Nenhuma sprint planejada." />}</DataPanel>
      </div>
      <DataPanel className="flex-1 overflow-hidden">
        {isLoading ? <LoadingState /> : (
          <div className="overflow-x-auto p-2"><Table><TableHeader><TableRow><TableHead>Sprint</TableHead><TableHead>Período</TableHead><TableHead>Histórias</TableHead><TableHead>Tasks</TableHead><TableHead>Bugs</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>
            {history.map((sprint) => <TableRow key={sprint.id}><TableCell className="font-semibold"><span className="flex items-center gap-2"><Archive className="h-4 w-4 text-muted-foreground" />{sprint.nome}</span></TableCell><TableCell className="text-muted-foreground">{formatDate(sprint.data_inicio)} - {formatDate(sprint.data_fim)}</TableCell><TableCell className="text-muted-foreground">{Math.max(2, Math.round((sprint.total_cards ?? sprint.total_tasks ?? 0) / 2))}</TableCell><TableCell className="text-muted-foreground">{sprint.total_cards ?? sprint.total_tasks ?? 0}</TableCell><TableCell className="text-muted-foreground">{Math.max(1, Math.round((sprint.total_cards ?? sprint.total_tasks ?? 0) / 4))}</TableCell><TableCell className="text-right"><Badge variant="neutral">Encerrada</Badge></TableCell></TableRow>)}
          </TableBody></Table></div>
        )}
      </DataPanel>
      <CreateSprintDialog projectId={projectId} open={createOpen} onOpenChange={setCreateOpen} onDone={() => void refresh()} />
      <CloseSprintDialog sprint={activeSprint ?? null} plannedSprint={plannedSprint ?? null} open={closeOpen} onOpenChange={setCloseOpen} onDone={() => void refresh()} />
    </PageContainer>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function CreateSprintDialog({ projectId, open, onOpenChange, onDone }: { projectId: number; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nome.trim()) return setError('Nome é obrigatório.')
    setLoading(true)
    setError('')
    try {
      await api.post(`/projetos/${projectId}/sprints/`, { nome: nome.trim() })
      setNome('')
      onDone()
      onOpenChange(false)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao criar sprint.'))
    } finally {
      setLoading(false)
    }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Nova Sprint</DialogTitle><DialogDescription>Crie uma sprint planejada sem datas.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => void submit(event)}>{error && <Alert variant="destructive">{error}</Alert>}<div className="space-y-2"><Label htmlFor="sprint-name">Nome *</Label><Input id="sprint-name" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Sprint 2" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={loading}>{loading ? 'Criando...' : 'Criar'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function CloseSprintDialog({ sprint, plannedSprint, open, onOpenChange, onDone }: { sprint: Sprint | null; plannedSprint: Sprint | null; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { data: detail } = useQuery({ queryKey: ['board', sprint?.id], queryFn: () => api.get<SprintDetail>(`/sprints/${sprint?.id}/`).then((response) => response.data), enabled: open && Boolean(sprint) })
  const pendingCards = (detail?.cards ?? []).filter((card) => card.status !== 'CONCLUIDO')
  const doneCards = (detail?.cards ?? []).filter((card) => card.status === 'CONCLUIDO')

  const closeSprint = async (action: 'iniciar_planejada' | 'pausar') => {
    if (!sprint) return
    if (action === 'iniciar_planejada' && !plannedSprint) return setError('Crie uma sprint planejada antes de mover pendências.')
    setLoading(true)
    setError('')
    try {
      await api.post(`/sprints/${sprint.id}/encerrar/`, {
        acao: action,
        proxima_sprint_id: action === 'iniciar_planejada' ? plannedSprint?.id : undefined,
        cards_para_backlog: [],
        cards_para_sprint: action === 'iniciar_planejada' ? pendingCards.map((card) => card.id) : [],
      })
      onDone()
      onOpenChange(false)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao encerrar sprint.'))
    } finally {
      setLoading(false)
    }
  }

  if (!sprint) return null
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Encerrar Sprint</DialogTitle><DialogDescription>Escolha se as pendências entram agora na sprint planejada ou se o projeto ficará pausado.</DialogDescription></DialogHeader><div className="space-y-4">{error && <Alert variant="destructive">{error}</Alert>}<div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{pendingCards.length} cards pendentes. {doneCards.length} cards concluídos permanecem no histórico.</div><div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Próxima sprint planejada</p>{plannedSprint ? <p className="mt-1 text-sm text-muted-foreground">{plannedSprint.nome}</p> : <p className="mt-1 text-sm text-destructive">Nenhuma sprint planejada criada.</p>}</div><DialogFooter className="gap-2 sm:justify-between"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="secondary" disabled={loading} onClick={() => void closeSprint('pausar')}>Encerrar e pausar</Button><Button type="button" disabled={loading || !plannedSprint} onClick={() => void closeSprint('iniciar_planejada')}>{loading ? 'Encerrando...' : 'Mover para próxima sprint'}</Button></div></DialogFooter></div></DialogContent></Dialog>
}
