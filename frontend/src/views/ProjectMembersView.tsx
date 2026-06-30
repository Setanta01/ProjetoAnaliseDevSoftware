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

const projectRoles: ProjectRole[] = ['GERENTE', 'DEV', 'QA']

function RolePicker({ value, onChange, compact = false }: { value: ProjectRole; onChange: (role: ProjectRole) => void; compact?: boolean }) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-input bg-card p-0.5">
      {projectRoles.map((role) => (
        <button
          key={role}
          type="button"
          className={`rounded px-2.5 font-semibold transition hover:bg-secondary ${compact ? 'h-7 text-[11px]' : 'h-9 text-xs'} ${value === role ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}
          onClick={() => onChange(role)}
          aria-pressed={value === role}
        >
          {role}
        </button>
      ))}
    </div>
  )
}

export default function ProjectMembersView({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [usuarioId, setUsuarioId] = useState('')
  const [cargo, setCargo] = useState<ProjectRole>('DEV')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { data: members = [], isLoading } = useQuery({ queryKey: ['project-members', projectId], queryFn: () => api.get<ProjectMember[]>(`/projetos/${projectId}/membros/`).then((response) => response.data), refetchOnWindowFocus: 'always', refetchInterval: 30000 })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get<Usuario[]>('/usuarios/').then((response) => response.data), refetchOnWindowFocus: 'always', refetchInterval: 60000 })
  const memberIds = new Set(members.map((member) => member.id))
  const availableUsers = users.filter((user) => user.ativo && !memberIds.has(user.id))

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.refetchQueries({ queryKey: ['my-projects'] }),
    ])
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
      {canManage && <DataPanel className="mb-5 overflow-visible">
        <div className="space-y-4 p-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Select value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)}><option value="">Selecionar usuário existente</option>{availableUsers.map((user) => <option key={user.id} value={user.id}>{user.nome} - {user.email}</option>)}</Select>
            <RolePicker value={cargo} onChange={setCargo} />
            <Button onClick={() => void addMember()} disabled={loading}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </div>
      </DataPanel>}
      {!canManage && error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      <DataPanel>{isLoading ? <LoadingState /> : <Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>E-mail</TableHead><TableHead>Função no projeto</TableHead>{canManage && <TableHead className="text-right">Ações</TableHead>}</TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.id}><TableCell><span className="flex items-center gap-3 font-semibold"><UserAvatar name={member.nome} />{member.nome}</span></TableCell><TableCell className="text-muted-foreground">{member.email}</TableCell><TableCell><div className="flex flex-wrap items-center gap-2">{canManage ? <RolePicker compact value={member.cargo} onChange={(role) => void updateRole(member, role)} /> : <RoleBadge cargo={member.cargo as Cargo} />}</div></TableCell>{canManage && <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-muted hover:text-destructive" onClick={() => void removeMember(member)} aria-label="Remover membro"><Trash2 className="h-4 w-4" /></Button></TableCell>}</TableRow>)}</TableBody></Table>}</DataPanel>
    </PageContainer>
  )
}
