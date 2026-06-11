import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

interface UserAvatarProps {
  name: string
  src?: string
  className?: string
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('h-9 w-9 shadow-sm', className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-accent text-accent-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
