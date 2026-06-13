import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Filter, MoreVertical, Plus } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { SearchField } from '@/components/app/SearchField'
import { PriorityBadge } from '@/components/app/TaskBadges'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Task } from '@/types'

interface BacklogViewProps {
  projetoId: number | null
  onNewCard: () => void
  onOpenCard: (id: number) => void
}

export default function BacklogView({ projetoId, onNewCard, onOpenCard }: BacklogViewProps) {
  const [search, setSearch] = useState('')
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['backlog', projetoId],
    queryFn: () => api.get<Task[]>(`/tasks/?projeto_id=${projetoId}&status=BACKLOG`).then((response) => response.data),
    enabled: Boolean(projetoId),
  })
  const filteredTasks = tasks.filter((task) => task.titulo.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageContainer className="flex flex-col">
      <PageHeader title="Backlog de Tasks" subtitle="Gestão de tasks não atribuídas à sprint." actions={<Button onClick={onNewCard}><Plus className="h-4 w-4" /> Nova Task</Button>} />
      <DataPanel className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-muted p-4"><SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no backlog..." /><Button variant="outline"><Filter className="h-4 w-4" /> Filtros</Button></div>
        <div className="flex-1 overflow-x-auto">
          {isLoading ? <LoadingState variant="table" label="Carregando backlog..." /> : filteredTasks.length === 0 ? <EmptyState message="Backlog vazio" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>ID da Task</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Pontos</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTasks.map((task) => (
                <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenCard(task.id)}>
                  <TableCell className="font-mono text-muted-foreground">{task.codigo ?? `#${task.id}`}</TableCell>
                  <TableCell className="font-semibold text-card-foreground">{task.titulo}</TableCell>
                  <TableCell><PriorityBadge prioridade={task.prioridade} /></TableCell>
                  <TableCell className="text-muted-foreground">{task.estimativa_consolidada ?? '-'}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted px-6 py-4 text-sm text-muted-foreground"><span>Mostrando {filteredTasks.length} de {tasks.length} tasks</span><div className="flex gap-2"><Button variant="outline" size="icon" disabled><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" disabled><ChevronRight className="h-4 w-4" /></Button></div></div>
      </DataPanel>
    </PageContainer>
  )
}
