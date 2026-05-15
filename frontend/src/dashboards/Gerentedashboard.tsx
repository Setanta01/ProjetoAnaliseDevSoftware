export default function GerenteDashboard() {
  const sprints = [
    { nome: 'Sprint 3', status: 'ATIVA', progresso: 65, tasks: 12 },
    { nome: 'Sprint 4', status: 'PLANEJADA', progresso: 0, tasks: 8 },
  ]

  const tasks = [
    { titulo: 'Implementar login', responsavel: 'Carlos Dev', status: 'EM_ANDAMENTO', prioridade: 'ALTA' },
    { titulo: 'Revisar API de usuários', responsavel: 'Maria QA', status: 'REVISAO', prioridade: 'MEDIA' },
    { titulo: 'Deploy produção', responsavel: 'Carlos Dev', status: 'TODO', prioridade: 'CRITICA' },
  ]

  const statusColor: Record<string, string> = {
    EM_ANDAMENTO: '#0891b2',
    REVISAO: '#d97706',
    TODO: '#6b7280',
    CONCLUIDO: '#16a34a',
    BLOQUEADO: '#dc2626',
  }

  const prioridadeColor: Record<string, string> = {
    BAIXA: '#16a34a',
    MEDIA: '#0891b2',
    ALTA: '#d97706',
    CRITICA: '#dc2626',
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Painel Gerente</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Acompanhamento de sprints e equipe</p>
      </div>

      {/* Sprints */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Sprints do projeto</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {sprints.map(s => (
            <div key={s.nome} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>{s.nome}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.status === 'ATIVA' ? '#dcfce7' : '#f3f4f6', color: s.status === 'ATIVA' ? '#16a34a' : '#6b7280' }}>{s.status}</span>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{s.tasks} tasks</div>
              <div style={{ background: '#f3f4f6', borderRadius: 99, height: 6 }}>
                <div style={{ background: '#0891b2', borderRadius: 99, height: 6, width: `${s.progresso}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.progresso}% concluído</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks da equipe */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Tasks da equipe</h2>
        {tasks.map(t => (
          <div key={t.titulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{t.titulo}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.responsavel}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: prioridadeColor[t.prioridade] + '20', color: prioridadeColor[t.prioridade] }}>{t.prioridade}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: statusColor[t.status] + '20', color: statusColor[t.status] }}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}