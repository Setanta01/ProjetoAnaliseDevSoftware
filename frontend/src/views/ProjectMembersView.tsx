import { useQuery } from '@tanstack/react-query'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { RoleBadge } from '@/components/app/TaskBadges'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Cargo, ProjectMember } from '@/types'

export default function ProjectMembersView({ projectId }: { projectId: number }) {
  const { data: members = [], isLoading } = useQuery({ queryKey: ['project-members', projectId], queryFn: () => api.get<ProjectMember[]>(`/projetos/${projectId}/membros/`).then((response) => response.data) })
  return (
    <PageContainer>
      <PageHeader title="Membros da Equipe" subtitle="Pessoas e funções dentro deste projeto." />
      <DataPanel>{isLoading ? <LoadingState /> : <Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>E-mail</TableHead><TableHead>Função no projeto</TableHead></TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.id}><TableCell><span className="flex items-center gap-3 font-semibold"><UserAvatar name={member.nome} />{member.nome}</span></TableCell><TableCell className="text-muted-foreground">{member.email}</TableCell><TableCell><RoleBadge cargo={member.cargo as Cargo} /></TableCell></TableRow>)}</TableBody></Table>}</DataPanel>
    </PageContainer>
  )
}
