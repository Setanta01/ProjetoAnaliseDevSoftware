import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { RoleBadge } from '@/components/app/TaskBadges'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/errors'
import type { Cargo, ProjectMember, ProjectRole, Usuario } from '@/types'

export default function ProjectMembersView({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const [usuarioId, setUsuarioId] = useState('')
  const [cargo, setCargo] = useState<ProjectRole>('DEV')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { data: members = [], isLoading } = useQuery({ queryKey: ['project-members', projectId], queryFn: () => api.get<ProjectMember[]>(`/projetos/${projectId}/membros/`).then((response) => response.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get<Usuario[]>('/usuarios/').then((response) => response.data) })
  const memberIds = new Set(members.map((member) => member.id))
  const availableUsers = users.filter((user) => user.ativo && !memberIds.has(user.id))

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
  }

  const addMember = async () => {
    if (!usuarioId) return setError('Selecione um usuário existente.')
    setLoading(true)
    setError('')
    try {
      await api.post(`/projetos/${projectId}/membros/`, { usuario_id: Number(usuarioId), cargo })
      setUsuarioId('')
      setCargo('DEV')
      await refresh()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao adicionar membro.'))
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (member: ProjectMember, nextRole: ProjectRole) => {
    setError('')
    try {
      await api.patch(`/projetos/${projectId}/membros/${member.id}/`, { cargo: nextRole })
      await refresh()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao alterar cargo.'))
    }
  }

  const removeMember = async (member: ProjectMember) => {
    setError('')
    try {
      await api.delete(`/projetos/${projectId}/membros/${member.id}/`)
      await refresh()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao remover membro.'))
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Membros da Equipe" subtitle="Pessoas e funções dentro deste projeto." />
      <DataPanel className="mb-5">
        <div className="space-y-4 p-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
            <Select value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)}><option value="">Selecionar usuário existente</option>{availableUsers.map((user) => <option key={user.id} value={user.id}>{user.nome} - {user.email}</option>)}</Select>
            <Select value={cargo} onChange={(event) => setCargo(event.target.value as ProjectRole)}><option value="GERENTE">GERENTE</option><option value="DEV">DEV</option><option value="QA">QA</option></Select>
            <Button onClick={() => void addMember()} disabled={loading}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </div>
      </DataPanel>
      <DataPanel>{isLoading ? <LoadingState /> : <Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>E-mail</TableHead><TableHead>Função no projeto</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.id}><TableCell><span className="flex items-center gap-3 font-semibold"><UserAvatar name={member.nome} />{member.nome}</span></TableCell><TableCell className="text-muted-foreground">{member.email}</TableCell><TableCell><div className="flex items-center gap-2"><RoleBadge cargo={member.cargo as Cargo} /><Select className="h-8 w-32" value={member.cargo} onChange={(event) => void updateRole(member, event.target.value as ProjectRole)}><option value="GERENTE">GERENTE</option><option value="DEV">DEV</option><option value="QA">QA</option></Select></div></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-muted hover:text-destructive" onClick={() => void removeMember(member)} aria-label="Remover membro"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table>}</DataPanel>
    </PageContainer>
  )
}
