import { LoaderCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  label?: string
  variant?: 'page' | 'table' | 'cards'
}

export function LoadingState({ label = 'Carregando...', variant = 'page' }: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label={label} aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-3 p-6" aria-label={label} aria-busy="true">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="flex min-h-40 items-center justify-center gap-2 p-8 text-sm text-muted-foreground" aria-label={label} aria-busy="true">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      {label}
    </div>
  )
}
