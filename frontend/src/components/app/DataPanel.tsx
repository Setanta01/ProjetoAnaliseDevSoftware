import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DataPanelProps {
  children: ReactNode
  title?: string
  action?: ReactNode
  className?: string
}

export function DataPanel({ children, title, action, className }: DataPanelProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <h2 className="text-sm font-bold text-card-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Card>
  )
}
