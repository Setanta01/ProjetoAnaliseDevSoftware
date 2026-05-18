// Correção: Importação de tipos do React
import type { CSSProperties, ReactNode } from 'react';

// Separação de imports de '../types'
import { PRIORIDADE_COLOR, STATUS_COLOR, TASK_STATUS_LABEL, PRIORIDADE_LABEL } from '../types.ts';
import type { Prioridade, TaskStatus } from '../types.ts';

export function Badge({ label, colors, size = 'sm' }: {
  label: string;
  colors?: { bg: string; text: string };
  size?: 'sm' | 'md';
}) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    borderRadius: 20,
    fontSize: size === 'sm' ? 11 : 12,
    fontWeight: 600,
    background: colors?.bg ?? '#F3F4F6',
    color: colors?.text ?? '#374151',
    letterSpacing: 0.3,
    whiteSpace: 'nowrap' as const,
  };
  return <span style={style}>{label}</span>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge label={TASK_STATUS_LABEL[status]} colors={STATUS_COLOR[status]} />;
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  return <Badge label={PRIORIDADE_LABEL[prioridade]} colors={PRIORIDADE_COLOR[prioridade]} />;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const bgColors  = ['#BFDBFE', '#A7F3D0', '#FDE68A', '#FBCFE8', '#DDD6FE'];
  const txtColors = ['#1E40AF', '#065F46', '#92400E', '#9D174D', '#5B21B6'];
  const idx = (name.charCodeAt(0) || 0) % bgColors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bgColors[idx], color: txtColors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #E5E7EB', borderTop: '3px solid #3B82F6',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({ message, icon = '📭' }: { message: string; icon?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{message}</div>
    </div>
  );
}

export function SectionCard({ title, children, action }: {
  title: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}