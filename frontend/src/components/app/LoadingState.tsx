import { LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      {label}
    </div>
  )
}
