import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentProps<'progress'> {
  value: number
}

function Progress({ value, className, ...props }: ProgressProps) {
  const normalized = Math.min(100, Math.max(0, value))
  return <progress className={cn('lazuli-progress h-2 w-full', className)} max={100} value={normalized} {...props} />
}

export { Progress }
