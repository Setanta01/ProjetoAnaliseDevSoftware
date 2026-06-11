import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
  wide?: boolean
}

export function PageContainer({ children, className, wide = false }: PageContainerProps) {
  return <main className={cn('mx-auto h-full w-full p-8', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>{children}</main>
}
