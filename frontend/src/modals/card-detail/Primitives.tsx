import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><div className="text-sm text-card-foreground">{children}</div></div>
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-7"><h3 className="mb-3 border-b border-border pb-3 text-sm font-bold">{title}</h3><div className="text-sm leading-relaxed text-muted-foreground">{children}</div></section>
}

export function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={cn('border-b-2 py-1 text-sm font-semibold', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')} onClick={onClick}>{children}</button>
}
