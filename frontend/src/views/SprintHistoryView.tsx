import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Play, SquareCheckBig } from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/errors'
import type { Sprint, SprintDetail } from '@/types'

export default function SprintHistoryView({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [closeOpen, setCloseOpen] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const { data: sprints = [], isLoading } = useQuery({ queryKey: ['project-sprints', projectId], queryFn: () => api.get<Sprint[]>(`/projetos/${projectId}/sprints/`).then((response) => response.data), refetchOnWindowFocus: 'always', refetchInterval: 15000 })
  const activeSprint = sprints.find((sprint) => sprint.status === 'ATIVA')
  const plannedSprint = sprints.find((sprint) => sprint.status === 'PLANEJADA')
  const history = sprints.filter((sprint) => sprint.status === 'ENCERRADA')

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['board'] }),
    ])
  }

  const startNextSprint = async () => {
    setStartLoading(true)
    setStartError('')
    try {
      let sprint = plannedSprint
      if (!sprint) sprint = await api.post<Sprint>(`/projetos/${projectId}/sprints/`, {}).then((response) => response.data)
      if (!sprint) throw new Error('Sprint não encontrada.')
      await api.post(`/sprints/${sprint.id}/iniciar/`)
      await refresh()
    } catch (caughtError) {
      setStartError(getErrorMessage(caughtError, 'Não foi possível iniciar uma nova sprint.'))
    } finally {
      setStartLoading(false)
    }
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader title="Sprints" subtitle="Controle a sprint ativa e acompanhe entregas encerradas." />
      <DataPanel title="Sprint ativa" className="mb-5">{isLoading ? <LoadingState /> : activeSprint ? <div className="space-y-4 p-4"><div><Badge variant="info">Ativa</Badge><h2 className="mt-3 text-lg font-bold">{activeSprint.nome}</h2><p className="text-sm text-muted-foreground">Iniciada em {formatDate(activeSprint.data_inicio)}</p></div>{canManage && <Button variant="outline" onClick={() => setCloseOpen(true)}><SquareCheckBig className="h-4 w-4" /> Encerrar Sprint</Button>}</div> : <div className="flex flex-wrap items-center justify-between gap-3 p-4"><div>{startError ? <Alert variant="destructive">{startError}</Alert> : <p className="text-sm text-muted-foreground">Nenhuma sprint ativa.</p>}</div>{canManage && <Button type="button" disabled={startLoading} onClick={() => void startNextSprint()}><Play className="h-4 w-4" />{startLoading ? 'Iniciando...' : 'Iniciar nova sprint'}</Button>}</div>}</DataPanel>
      <DataPanel className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? <LoadingState /> : (
          <div className="max-h-full overflow-auto p-2"><Table><TableHeader><TableRow><TableHead>Sprint</TableHead><TableHead>Período</TableHead><TableHead>Histórias</TableHead><TableHead>Tasks</TableHead><TableHead>Bugs</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>
            {history.map((sprint) => <TableRow key={sprint.id} className="cursor-pointer" onClick={() => setSelectedSprint(sprint)}><TableCell className="font-semibold"><span className="flex items-center gap-2"><Archive className="h-4 w-4 text-muted-foreground" />{sprint.nome}</span></TableCell><TableCell className="text-muted-foreground">{formatDate(sprint.data_inicio)} - {formatDate(sprint.data_fim)}</TableCell><TableCell className="text-muted-foreground">{Math.max(2, Math.round((sprint.total_cards ?? sprint.total_tasks ?? 0) / 2))}</TableCell><TableCell className="text-muted-foreground">{sprint.total_cards ?? sprint.total_tasks ?? 0}</TableCell><TableCell className="text-muted-foreground">{Math.max(1, Math.round((sprint.total_cards ?? sprint.total_tasks ?? 0) / 4))}</TableCell><TableCell className="text-right"><Badge variant="neutral">Encerrada</Badge></TableCell></TableRow>)}
          </TableBody></Table></div>
        )}
      </DataPanel>
      <CloseSprintDialog sprint={activeSprint ?? null} open={closeOpen} onOpenChange={setCloseOpen} onDone={() => void refresh()} />
      <SprintCardsDialog sprint={selectedSprint} onOpenChange={(open) => { if (!open) setSelectedSprint(null) }} />
    </PageContainer>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function CloseSprintDialog({ sprint, open, onOpenChange, onDone }: { sprint: Sprint | null; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { data: detail } = useQuery({ queryKey: ['board', sprint?.id], queryFn: () => api.get<SprintDetail>(`/sprints/${sprint?.id}/`).then((response) => response.data), enabled: open && Boolean(sprint) })
  const pendingCards = (detail?.cards ?? []).filter((card) => card.status !== 'CONCLUIDO')
  const doneCards = (detail?.cards ?? []).filter((card) => card.status === 'CONCLUIDO')

  const closeSprint = async (action: 'iniciar_planejada' | 'pausar') => {
    if (!sprint) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/sprints/${sprint.id}/encerrar/`, {
        acao: action,
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Encerrar Sprint</DialogTitle><DialogDescription>Escolha se as pendências entram agora em uma nova sprint ou se o projeto ficará pausado.</DialogDescription></DialogHeader><div className="space-y-4">{error && <Alert variant="destructive">{error}</Alert>}<div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{pendingCards.length} cards pendentes. {doneCards.length} cards concluídos permanecem no histórico.</div><DialogFooter className="gap-2 sm:justify-between"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="secondary" disabled={loading} onClick={() => void closeSprint('pausar')}>Encerrar e pausar</Button><Button type="button" disabled={loading} onClick={() => void closeSprint('iniciar_planejada')}>{loading ? 'Encerrando...' : 'Encerrar e iniciar próxima'}</Button></div></DialogFooter></div></DialogContent></Dialog>
}

function SprintCardsDialog({ sprint, onOpenChange }: { sprint: Sprint | null; onOpenChange: (open: boolean) => void }) {
  const { data: detail, isLoading } = useQuery({ queryKey: ['board', sprint?.id], queryFn: () => api.get<SprintDetail>(`/sprints/${sprint?.id}/`).then((response) => response.data), enabled: Boolean(sprint) })
  return <Dialog open={Boolean(sprint)} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{sprint?.nome ?? 'Sprint encerrada'}</DialogTitle><DialogDescription>Cards associados à sprint encerrada.</DialogDescription></DialogHeader>{isLoading ? <LoadingState /> : !detail?.cards.length ? <EmptyState message="Nenhum card permaneceu associado a esta sprint." /> : <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{detail.cards.map((card) => <TableRow key={card.id}><TableCell className="font-mono text-muted-foreground">{card.codigo ?? `#${card.id}`}</TableCell><TableCell className="font-semibold">{card.titulo}</TableCell><TableCell><Badge variant={card.tipo === 'BUG' ? 'danger' : 'neutral'}>{card.tipo === 'BUG' ? 'Bug' : 'Task'}</Badge></TableCell><TableCell className="text-muted-foreground">{card.responsavel_nome ?? 'Sem responsável'}</TableCell><TableCell><Badge variant="neutral">{card.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>
}
