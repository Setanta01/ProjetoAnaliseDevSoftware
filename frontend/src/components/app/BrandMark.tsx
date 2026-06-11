import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  compact?: boolean
  inverted?: boolean
  className?: string
}

export function BrandMark({ compact = false, inverted = false, className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LayoutGrid className="h-5 w-5" />
      </span>
      {!compact && <span className={cn('text-xl font-bold', inverted ? 'text-white' : 'text-foreground')}>Lazuli</span>}
    </div>
  )
}
