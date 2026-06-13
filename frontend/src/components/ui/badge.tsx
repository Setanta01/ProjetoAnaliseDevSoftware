import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        neutral: 'bg-secondary text-secondary-foreground',
        success: 'bg-success-muted text-success-foreground',
        danger: 'bg-danger-muted text-destructive',
        warning: 'bg-warning-muted text-warning',
        urgent: 'bg-urgent-muted text-urgent',
        info: 'bg-accent text-accent-foreground',
        planning: 'bg-planning-muted text-planning',
        id: 'rounded-md bg-secondary font-mono font-medium tracking-tighter text-muted-foreground',
        outline: 'border-border bg-card text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
