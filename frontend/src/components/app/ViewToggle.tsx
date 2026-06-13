import { CheckSquare, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ViewMode = 'kanban' | 'list'

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="flex rounded-md bg-secondary p-1">
      <Button variant="ghost" size="sm" className={cn(value === 'kanban' && 'bg-card text-foreground shadow-sm hover:bg-card')} onClick={() => onChange('kanban')}><CheckSquare className="h-4 w-4" /> Kanban</Button>
      <Button variant="ghost" size="sm" className={cn(value === 'list' && 'bg-card text-foreground shadow-sm hover:bg-card')} onClick={() => onChange('list')}><List className="h-4 w-4" /> Lista</Button>
    </div>
  )
}
