import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Columns3, FolderCog, LayoutGrid, ListTodo, RotateCcw, Users } from 'lucide-react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import api from '@/api'
import { AppShell, type AppNavItem } from '@/components/app/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { demoProfiles } from '@/demo/data'
import { resetDemoDatabase } from '@/demo/store'
import { AUTHENTICATED_HOME } from '@/lib/auth-routing'
import MfaSettingsModal from '@/auth/MfaSettingsModal'
import CardDetailModal from '@/modals/CardDetailModal'
import CreateCardModal from '@/modals/CreateCardModal'
import AdminProjectsView from '@/views/AdminProjectsView'
import BacklogView from '@/views/BacklogView'
import BoardView from '@/views/BoardView'
import MyProjectsView from '@/views/MyProjectsView'
import ProjectMembersView from '@/views/ProjectMembersView'
import SprintHistoryView from '@/views/SprintHistoryView'
import type { Cargo, Projeto, Sprint } from '@/types'
import type { UserProfile } from '@/types'

type WorkspaceProfile = UserProfile & { cargo?: Cargo }

interface DemoWorkspaceProps {
  initialProfile: WorkspaceProfile
  onProfileChange: (profile: WorkspaceProfile) => void
  onExit: () => void
  demoMode?: boolean
}

export function DemoWorkspace({ initialProfile, onProfileChange, onExit, demoMode = true }: DemoWorkspaceProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(initialProfile)
  const [showMfaSettings, setShowMfaSettings] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const projectId = Number(location.pathname.match(/\/app\/projects\/(\d+)/)?.[1]) || null
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => api.get<Projeto>(`/projetos/${projectId}/`).then((response) => response.data), enabled: Boolean(projectId) })
  const { data: sprints = [] } = useQuery({ queryKey: ['project-sprints', projectId], queryFn: () => api.get<Sprint[]>(`/projetos/${projectId}/sprints/`).then((response) => response.data), enabled: Boolean(projectId) })
  const activeSprint = sprints.find((sprint) => sprint.status === 'ATIVA')

  const globalNav: AppNavItem[] = [
    { label: 'Meus Projetos', to: '/app/projects', icon: LayoutGrid, section: 'global' },
    ...(profile.admin ? [{ label: 'Projetos Admin', to: '/app/admin/projects', icon: FolderCog, section: 'global' as const }] : []),
  ]
  const projectNav: AppNavItem[] = projectId ? [
    { label: 'Sprint Board', to: `/app/projects/${projectId}/board`, icon: Columns3, section: 'project' },
    { label: 'Backlog', to: `/app/projects/${projectId}/backlog`, icon: ListTodo, section: 'project' },
    { label: 'Membros da Equipe', to: `/app/projects/${projectId}/members`, icon: Users, section: 'project' },
    { label: 'Histórico de Sprints', to: `/app/projects/${projectId}/sprints`, icon: Archive, section: 'project' },
  ] : []

  const changeRole = (cargo: Cargo) => {
    const nextProfile = demoProfiles[cargo]
    localStorage.setItem('lazuli_demo_role', cargo)
    setProfile(nextProfile)
    onProfileChange(nextProfile)
    navigate(AUTHENTICATED_HOME)
  }

  const resetData = async () => {
    resetDemoDatabase()
    await queryClient.invalidateQueries()
    navigate(AUTHENTICATED_HOME)
  }

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
      user={{ username: profile.nome, email: profile.email, cargo: demoMode ? (profile.cargo ?? 'USUÁRIO') : (profile.admin ? 'ADMIN' : 'USUÁRIO'), mfa_ativo: profile.mfa_ativo }}
      navItems={[...globalNav, ...projectNav]}
      projectContext={project ? { name: project.nome, sprintName: activeSprint?.nome } : undefined}
      onMfaSettings={() => setShowMfaSettings(true)}
      onLogout={onExit}
      topbarActions={demoMode ? (
        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="planning">Modo demo</Badge>
          <Select className="h-8 w-32 border-white/20 bg-white/10 text-white shadow-none" value={profile.cargo ?? 'DEV'} onChange={(event) => changeRole(event.target.value as Cargo)} aria-label="Perfil de demonstração">
            <option className="text-foreground" value="ADMIN">Admin</option><option className="text-foreground" value="GERENTE">Gerente</option><option className="text-foreground" value="DEV">Dev</option><option className="text-foreground" value="QA">QA</option>
          </Select>
          <Button variant="ghost" size="sm" className="text-topbar-foreground hover:bg-white/10 hover:text-white" onClick={() => void resetData()}><RotateCcw className="h-4 w-4" /> Resetar</Button>
        </div>
      ) : undefined}
    >
      <Routes>
        <Route path="projects" element={<MyProjectsView onSelect={selectProject} />} />
        {profile.admin && <Route path="admin/projects" element={<AdminProjectsView />} />}
        <Route path="projects/:projectId/board" element={<BoardView sprintId={activeSprint?.id ?? null} projetoId={projectId} onOpenCard={setSelectedCardId} onNewCard={() => setShowCreateCard(true)} isAdmin={profile.admin} />} />
        <Route path="projects/:projectId/backlog" element={<BacklogView projetoId={projectId} onOpenCard={setSelectedCardId} onNewCard={() => setShowCreateCard(true)} />} />
        <Route path="projects/:projectId/members" element={projectId ? <ProjectMembersView projectId={projectId} /> : <Navigate to={AUTHENTICATED_HOME} replace />} />
        <Route path="projects/:projectId/sprints" element={projectId ? <SprintHistoryView projectId={projectId} /> : <Navigate to={AUTHENTICATED_HOME} replace />} />
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="*" element={<Navigate to="projects" replace />} />
      </Routes>

      {showCreateCard && projectId && <CreateCardModal projetoId={projectId} sprintId={activeSprint?.id} onClose={() => setShowCreateCard(false)} onSuccess={() => void refreshTasks()} />}
      <CardDetailModal cardId={selectedCardId} onClose={() => { setSelectedCardId(null); void refreshTasks() }} />
      <MfaSettingsModal open={showMfaSettings} onOpenChange={setShowMfaSettings} onStatusChange={(active, type) => { const nextProfile = { ...profile, mfa_ativo: active, mfa_tipo: type }; setProfile(nextProfile); onProfileChange(nextProfile) }} />
    </AppShell>
  )
}
