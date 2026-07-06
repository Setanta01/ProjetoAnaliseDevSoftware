import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Columns3, FolderCog, LayoutGrid, ListTodo, UserPlus, Users } from 'lucide-react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import api from '@/api'
import MfaSettingsModal from '@/auth/MfaSettingsModal'
import { AppShell, type AppNavItem } from '@/components/app/AppShell'
import { AUTHENTICATED_HOME } from '@/lib/auth-routing'
import CardDetailModal from '@/modals/CardDetailModal'
import CreateCardModal from '@/modals/CreateCardModal'
import AdminInvitationsView from '@/views/AdminInvitationsView'
import AdminProjectsView from '@/views/AdminProjectsView'
import BacklogView from '@/views/BacklogView'
import BoardView from '@/views/BoardView'
import MyProjectsView from '@/views/MyProjectsView'
import ProjectMembersView from '@/views/ProjectMembersView'
import SprintHistoryView from '@/views/SprintHistoryView'
import type { Projeto, Sprint, UserProfile } from '@/types'

interface WorkspaceProps {
  initialProfile: UserProfile
  onProfileChange: (profile: UserProfile) => void
  onExit: () => void
}

export function Workspace({ initialProfile, onProfileChange, onExit }: WorkspaceProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(initialProfile)
  const [showMfaSettings, setShowMfaSettings] = useState(false)
  const [createCardTarget, setCreateCardTarget] = useState<'backlog' | 'sprint' | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const projectId = Number(location.pathname.match(/\/app\/projects\/(\d+)/)?.[1]) || null
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => api.get<Projeto>(`/projetos/${projectId}/`).then((response) => response.data), enabled: Boolean(projectId) })
  const { data: sprints = [] } = useQuery({ queryKey: ['project-sprints', projectId], queryFn: () => api.get<Sprint[]>(`/projetos/${projectId}/sprints/`).then((response) => response.data), enabled: Boolean(projectId) })
  const activeSprint = sprints.find((sprint) => sprint.status === 'ATIVA')
  const canManageProject = Boolean(profile.admin || project?.meu_cargo === 'GERENTE')
  const projectRole = profile.admin ? 'ADMIN' : project?.meu_cargo

  const globalNav: AppNavItem[] = [
    { label: 'Meus Projetos', to: '/app/projects', icon: LayoutGrid, section: 'global' },
    ...(profile.admin ? [
      { label: 'Projetos Admin', to: '/app/admin/projects', icon: FolderCog, section: 'global' as const },
      { label: 'Enviar Convites', to: '/app/admin/invitations', icon: UserPlus, section: 'global' as const },
    ] : []),
  ]
  const projectNav: AppNavItem[] = projectId ? [
    { label: 'Sprint Board', to: `/app/projects/${projectId}/board`, icon: Columns3, section: 'project' },
    { label: 'Backlog', to: `/app/projects/${projectId}/backlog`, icon: ListTodo, section: 'project' },
    { label: 'Membros da Equipe', to: `/app/projects/${projectId}/members`, icon: Users, section: 'project' },
    { label: 'Histórico de Sprints', to: `/app/projects/${projectId}/sprints`, icon: Archive, section: 'project' },
  ] : []

  const refreshTasks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['backlog'] }),
      queryClient.invalidateQueries({ queryKey: ['task'] }),
    ])
  }

  const selectProject = (selectedProject: Projeto) => navigate(`/app/projects/${selectedProject.id}/board`)

  return (
    <AppShell
      user={{ username: profile.nome, email: profile.email, cargo: profile.admin ? 'ADMIN' : 'USUÁRIO', mfa_ativo: profile.mfa_ativo }}
      navItems={[...globalNav, ...projectNav]}
      projectContext={project ? { name: project.nome, sprintName: activeSprint?.nome } : undefined}
      onMfaSettings={() => setShowMfaSettings(true)}
      onLogout={onExit}
    >
      <Routes>
        <Route path="projects" element={<MyProjectsView onSelect={selectProject} />} />
        {profile.admin && <Route path="admin/projects" element={<AdminProjectsView />} />}
        {profile.admin && <Route path="admin/invitations" element={<AdminInvitationsView />} />}
        <Route path="projects/:projectId/board" element={<BoardView sprintId={activeSprint?.id ?? null} projetoId={projectId} projectName={project?.nome} onOpenCard={setSelectedCardId} onNewCard={() => setCreateCardTarget('sprint')} canManage={canManageProject} currentUserId={profile.id} currentRole={projectRole} />} />
        <Route path="projects/:projectId/backlog" element={<BacklogView projetoId={projectId} activeSprintId={activeSprint?.id} onOpenCard={setSelectedCardId} onNewCard={() => setCreateCardTarget('backlog')} canManage={canManageProject} currentRole={projectRole} />} />
        <Route path="projects/:projectId/members" element={projectId ? <ProjectMembersView projectId={projectId} canManage={canManageProject} /> : <Navigate to={AUTHENTICATED_HOME} replace />} />
        <Route path="projects/:projectId/sprints" element={projectId ? <SprintHistoryView projectId={projectId} canManage={canManageProject} /> : <Navigate to={AUTHENTICATED_HOME} replace />} />
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="*" element={<Navigate to="projects" replace />} />
      </Routes>

      {createCardTarget && projectId && <CreateCardModal projetoId={projectId} sprintId={createCardTarget === 'sprint' ? activeSprint?.id : undefined} mode={createCardTarget} currentRole={projectRole} onClose={() => setCreateCardTarget(null)} onSuccess={() => void refreshTasks()} />}
      <CardDetailModal cardId={selectedCardId} canManage={canManageProject} currentUserId={profile.id} currentRole={projectRole} onClose={() => { setSelectedCardId(null); void refreshTasks() }} />
      <MfaSettingsModal open={showMfaSettings} onOpenChange={setShowMfaSettings} onStatusChange={(active, type) => { const nextProfile = { ...profile, mfa_ativo: active, mfa_tipo: type }; setProfile(nextProfile); onProfileChange(nextProfile) }} />
    </AppShell>
  )
}
