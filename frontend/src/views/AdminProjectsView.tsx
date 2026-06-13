import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, FolderOpen, Plus, Trash2 } from 'lucide-react'
import api from '@/api'
import { DataPanel } from '@/components/app/DataPanel'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { SearchField } from '@/components/app/SearchField'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import type { Projeto } from '@/types'

type ProjectDialog = { type: 'create' } | { type: 'edit'; project: Projeto } | { type: 'delete'; project: Projeto } | null

export default function AdminProjectsView() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialog, setDialog] = useState<ProjectDialog>(null)
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['admin-projects'], queryFn: () => api.get<Projeto[]>('/admin/projetos/').then((response) => response.data) })
  const filteredProjects = projects.filter((project) => `${project.nome} ${project.descricao ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-projects'] }), queryClient.invalidateQueries({ queryKey: ['my-projects'] })])
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader
        title="Gerenciamento de Projetos"
        subtitle="Visão geral e controle de todos os projetos ativos na organização."
        actions={<><SearchField className="sm:w-[220px]" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar projetos..." /><Button onClick={() => setDialog({ type: 'create' })}><Plus className="h-4 w-4" /> Novo Projeto</Button></>}
      />
      <DataPanel className="flex-1 overflow-hidden">
        {isLoading ? <LoadingState variant="table" label="Carregando projetos..." /> : filteredProjects.length === 0 ? <EmptyState message={searchTerm ? `Nenhum projeto encontrado para "${searchTerm}"` : 'Nenhum projeto cadastrado ainda.'} /> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome do Projeto</TableHead><TableHead>Membros</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
            {filteredProjects.map((project) => <TableRow key={project.id}><TableCell><span className="flex items-center gap-3 font-semibold"><span className={project.status === 'ATIVO' ? 'h-7 w-1 rounded-full bg-success' : 'h-7 w-1 rounded-full bg-border'} />{project.nome}</span></TableCell><TableCell className="text-muted-foreground">{project.member_count ?? 0}</TableCell><TableCell><span className={project.status === 'ATIVO' ? 'inline-flex rounded-full bg-success-muted px-3 py-1 text-xs font-semibold text-success-foreground' : 'inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground'}>{project.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'edit', project })} title="Editar"><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-danger-muted hover:text-destructive" onClick={() => setDialog({ type: 'delete', project })} title="Excluir"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
          </TableBody></Table></div>
        )}
      </DataPanel>
      <ProjectFormDialog key={dialog?.type === 'edit' ? `edit-${dialog.project.id}` : dialog?.type ?? 'closed'} dialog={dialog?.type === 'create' || dialog?.type === 'edit' ? dialog : null} onClose={() => setDialog(null)} onSuccess={() => void refresh()} />
      <DeleteProjectDialog project={dialog?.type === 'delete' ? dialog.project : null} onClose={() => setDialog(null)} onSuccess={() => void refresh()} />
    </PageContainer>
  )
}

function ProjectFormDialog({ dialog, onClose, onSuccess }: { dialog: Extract<ProjectDialog, { type: 'create' | 'edit' }> | null; onClose: () => void; onSuccess: () => void }) {
  const project = dialog?.type === 'edit' ? dialog.project : null
  const [nome, setNome] = useState(project?.nome ?? '')
  const [descricao, setDescricao] = useState(project?.descricao ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!dialog) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nome.trim()) return setError('Nome é obrigatório.')
    setLoading(true)
    setError('')
    try {
      const payload = { nome: nome.trim(), descricao: descricao.trim() }
      if (project) await api.patch(`/admin/projetos/${project.id}/`, payload)
      else await api.post('/admin/projetos/', payload)
      onSuccess()
      onClose()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, project ? 'Erro ao editar projeto.' : 'Erro ao criar projeto.'))
    } finally {
      setLoading(false)
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent><DialogHeader><span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><FolderOpen className="h-5 w-5" /></span><DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle><DialogDescription>{project ? 'Atualize os dados do projeto.' : 'Preencha os dados do projeto'}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>{error && <Alert variant="destructive">{error}</Alert>}<div className="space-y-2"><Label htmlFor="project-name">Nome do projeto *</Label><Input id="project-name" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Sistema de Gestão" autoFocus /></div><div className="space-y-2"><Label htmlFor="project-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="project-description" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Descreva o objetivo do projeto..." /></div><DialogFooter className="border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? (project ? 'Salvando...' : 'Criando...') : (project ? 'Salvar alterações' : 'Criar projeto')}</Button></DialogFooter></form></DialogContent></Dialog>
}

function DeleteProjectDialog({ project, onClose, onSuccess }: { project: Projeto | null; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!project) return null

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      await api.delete(`/admin/projetos/${project.id}/`)
      onSuccess()
      onClose()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao excluir projeto.'))
    } finally {
      setLoading(false)
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-w-md"><DialogHeader><span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-muted text-destructive"><Trash2 className="h-5 w-5" /></span><DialogTitle className="text-base">Excluir projeto?</DialogTitle><DialogDescription>O projeto <strong className="text-foreground">{project.nome}</strong> e todas as suas sprints e tasks serão excluídos permanentemente. Essa ação não pode ser desfeita.</DialogDescription></DialogHeader>{error && <Alert variant="destructive">{error}</Alert>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={loading}>{loading ? 'Excluindo...' : 'Sim, excluir'}</Button></DialogFooter></DialogContent></Dialog>
}
