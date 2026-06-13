import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-destructive/20 bg-danger-muted text-destructive',
      success: 'border-success/20 bg-success-muted text-success-foreground',
      warning: 'border-warning/20 bg-warning-muted text-warning',
      info: 'border-primary/20 bg-accent text-accent-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

interface AlertProps extends React.ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
