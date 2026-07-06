import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Shield, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BrandMark } from '@/components/app/BrandMark'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AppNavItem {
  label: string
  to: string
  icon: LucideIcon
  section?: 'global' | 'project'
}

interface AppShellProps {
  children: ReactNode
  user: { username: string; email: string; cargo: string; mfa_ativo: boolean }
  onMfaSettings: () => void
  onLogout: () => void
  navItems?: AppNavItem[]
  topbarActions?: ReactNode
  projectContext?: { name: string; sprintName?: string }
}

const defaultNavItems: AppNavItem[] = [{ label: 'Painel', to: '/app', icon: LayoutDashboard }]

export function AppShell({ children, user, onMfaSettings, onLogout, navItems = defaultNavItems, topbarActions, projectContext }: AppShellProps) {
  const ShieldIcon = user.mfa_ativo ? ShieldCheck : Shield
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={cn('h-screen overflow-hidden bg-background md:grid md:grid-rows-[4rem_1fr]', collapsed ? 'md:grid-cols-[4rem_1fr]' : 'md:grid-cols-[16rem_1fr]')}>
      <aside className="row-span-2 hidden border-r border-border bg-sidebar transition-[width] md:flex md:flex-col">
        <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
          <BrandMark compact={collapsed} />
          {!collapsed && <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} aria-label="Recolher menu"><PanelLeftClose className="h-4 w-4" /></Button>}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto py-4">
          {collapsed && <Button variant="ghost" size="icon" className="mx-auto mb-2 flex" onClick={() => setCollapsed(false)} aria-label="Expandir menu"><PanelLeftOpen className="h-4 w-4" /></Button>}
          {navItems.map((item, index) => {
            const Icon = item.icon
            const showProjectHeading = item.section === 'project' && navItems[index - 1]?.section !== 'project' && projectContext
            return (
              <div key={item.to}>
                {showProjectHeading && !collapsed && <div className="mb-2 mt-7 px-7"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{projectContext.name}</p>{projectContext.sprintName && <p className="mt-1 text-sm text-muted-foreground">{projectContext.sprintName}</p>}</div>}
                <NavLink
                  to={item.to}
                  end={item.to === '/app' || item.to === '/app/projects'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 border-l-4 border-transparent py-2.5 font-medium text-sidebar-foreground transition-colors hover:bg-secondary',
                    collapsed ? 'justify-center px-2' : 'px-5',
                    isActive && 'border-primary bg-sidebar-active text-sidebar-active-foreground',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && item.label}
                </NavLink>
              </div>
            )
          })}
        </nav>
        <div className={cn('space-y-2 border-t border-border', collapsed ? 'p-2' : 'p-4')}>
          <Button variant="outline" size={collapsed ? 'icon' : 'default'} className={cn(collapsed ? 'mx-auto flex' : 'w-full justify-start')} onClick={onMfaSettings} title={collapsed ? 'Configurações' : undefined}>
            <ShieldIcon className="h-4 w-4" />
            {!collapsed && (user.mfa_ativo ? 'MFA ativo' : 'Configurações')}
          </Button>
          <Button variant="ghost" size={collapsed ? 'icon' : 'default'} className={cn('text-destructive hover:bg-danger-muted hover:text-destructive', collapsed ? 'mx-auto flex' : 'w-full justify-start')} onClick={onLogout} title={collapsed ? 'Sair' : undefined}>
            <LogOut className="h-4 w-4" />
            {!collapsed && 'Sair'}
          </Button>
        </div>
      </aside>

      <header className="flex h-16 items-center justify-between bg-topbar px-4 text-topbar-foreground md:px-6">
        <BrandMark inverted className="md:hidden" />
        <div className="ml-auto flex items-center gap-3">
          {topbarActions}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-white">{user.username}</p>
            <p className="text-xs text-topbar-foreground">{user.cargo}</p>
          </div>
          <UserAvatar name={user.username || user.email} className="h-8 w-8" />
          <Button variant="ghost" size="icon" className="text-topbar-foreground hover:bg-white/10 hover:text-white md:hidden" onClick={onLogout} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
    </div>
  )
}
