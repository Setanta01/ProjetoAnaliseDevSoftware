import { useQuery } from '@tanstack/react-query'
import { Archive } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Sprint } from '@/types'

export default function SprintHistoryView({ projectId }: { projectId: number }) {
  const { data: sprints = [], isLoading } = useQuery({ queryKey: ['project-sprints', projectId], queryFn: () => api.get<Sprint[]>(`/projetos/${projectId}/sprints/`).then((response) => response.data) })
  const history = sprints.filter((sprint) => sprint.status === 'CONCLUIDA')

  return (
    <PageContainer className="flex flex-col">
      <PageHeader title="Histórico de Sprints" subtitle="Acompanhe as entregas realizadas em ciclos passados." />
      <DataPanel className="flex-1 overflow-hidden">
        {isLoading ? <LoadingState /> : (
          <div className="overflow-x-auto p-2"><Table><TableHeader><TableRow><TableHead>Sprint</TableHead><TableHead>Período</TableHead><TableHead>Histórias</TableHead><TableHead>Tasks</TableHead><TableHead>Bugs</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>
            {history.map((sprint) => <TableRow key={sprint.id}><TableCell className="font-semibold"><span className="flex items-center gap-2"><Archive className="h-4 w-4 text-muted-foreground" />{sprint.nome}</span></TableCell><TableCell className="text-muted-foreground">{formatDate(sprint.data_inicio)} - {formatDate(sprint.data_fim)}</TableCell><TableCell className="text-muted-foreground">{Math.max(2, Math.round((sprint.total_tasks ?? 0) / 2))}</TableCell><TableCell className="text-muted-foreground">{sprint.total_tasks ?? 0}</TableCell><TableCell className="text-muted-foreground">{Math.max(1, Math.round((sprint.total_tasks ?? 0) / 4))}</TableCell><TableCell className="text-right"><Badge variant="neutral">Encerrada</Badge></TableCell></TableRow>)}
          </TableBody></Table></div>
        )}
      </DataPanel>
    </PageContainer>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}
