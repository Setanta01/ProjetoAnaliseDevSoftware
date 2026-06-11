import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
}

export function EmptyState({ message, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground">
      <Icon className="mb-3 h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
