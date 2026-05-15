export default function DevDashboard() {
  const minhasTasks = [
    { titulo: 'Implementar login JWT', sprint: 'Sprint 3', status: 'EM_ANDAMENTO', prioridade: 'ALTA' },
    { titulo: 'Criar endpoint de perfil', sprint: 'Sprint 3', status: 'TODO', prioridade: 'MEDIA' },
    { titulo: 'Deploy produção', sprint: 'Sprint 3', status: 'BLOQUEADO', prioridade: 'CRITICA' },
    { titulo: 'Refatorar models', sprint: 'Backlog', status: 'BACKLOG', prioridade: 'BAIXA' },
  ]

  const statusColor: Record<string, string> = {
    EM_ANDAMENTO: '#0891b2',
    REVISAO: '#d97706',
    TODO: '#6b7280',
    CONCLUIDO: '#16a34a',
    BLOQUEADO: '#dc2626',
    BACKLOG: '#9333ea',
  }

  const prioridadeColor: Record<string, string> = {
    BAIXA: '#16a34a',
    MEDIA: '#0891b2',
    ALTA: '#d97706',
    CRITICA: '#dc2626',
  }

  const resumo = [
    { label: 'Em andamento', value: 1, color: '#0891b2' },
    { label: 'A fazer', value: 1, color: '#6b7280' },
    { label: 'Bloqueadas', value: 1, color: '#dc2626' },
    { label: 'Concluídas', value: 0, color: '#16a34a' },
  ]

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Meu Painel</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Suas tasks e atividades</p>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {resumo.map(r => (
          <div key={r.label} style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem', border: `2px solid ${r.color}20`, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: r.color }}>{r.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Minhas tasks</h2>
        {minhasTasks.map(t => (
          <div key={t.titulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{t.titulo}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.sprint}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: prioridadeColor[t.prioridade] + '20', color: prioridadeColor[t.prioridade] }}>{t.prioridade}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: statusColor[t.status] + '20', color: statusColor[t.status] }}>{t.status.replace('_', ' ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}