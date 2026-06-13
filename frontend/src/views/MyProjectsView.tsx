import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Users } from 'lucide-react'
import api from '@/api'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingState } from '@/components/app/LoadingState'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Projeto } from '@/types'

export default function MyProjectsView({ onSelect }: { onSelect: (project: Projeto) => void }) {
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['my-projects'], queryFn: () => api.get<Projeto[]>('/projetos/').then((response) => response.data) })

  return (
    <PageContainer wide className="max-w-6xl">
      <PageHeader title="Meus Projetos" subtitle="Selecione um projeto para acessar o board." />
      {isLoading ? <LoadingState variant="cards" label="Carregando projetos..." /> : projects.length === 0 ? <EmptyState message="Você ainda não participa de nenhum projeto." /> : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <button key={project.id} className="text-left" onClick={() => onSelect(project)}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary"><FolderKanban className="h-6 w-6" /></span>
                    <div className="min-w-0"><h2 className="text-lg font-bold text-card-foreground">{project.nome}</h2>{project.meu_cargo && <p className="mt-1 text-xs text-muted-foreground">{project.meu_cargo}</p>}</div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {project.member_count ?? 0} membros</span>
                    <Badge variant={project.status === 'ATIVO' ? 'success' : 'neutral'}>{project.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
