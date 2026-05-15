export default function AdminDashboard() {
  const stats = [
    { label: 'Usuários ativos', value: '24', icon: '👥' },
    { label: 'Projetos', value: '8', icon: '📁' },
    { label: 'Convites pendentes', value: '3', icon: '✉️' },
    { label: 'Sprints ativas', value: '5', icon: '🏃' },
  ]

  const usuarios = [
    { nome: 'Ana Silva', cargo: 'GERENTE', ativo: true },
    { nome: 'Carlos Dev', cargo: 'DEV', ativo: true },
    { nome: 'Maria QA', cargo: 'QA', ativo: false },
  ]

  const cargoBadge: Record<string, string> = {
    ADMIN: '#7c3aed',
    GERENTE: '#0891b2',
    DEV: '#16a34a',
    QA: '#d97706',
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Painel Admin</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Visão geral do sistema</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usuários + Ações */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Usuários recentes</h2>
          {usuarios.map(u => (
            <div key={u.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                  {u.nome.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{u.nome}</div>
                  <span style={{ fontSize: 11, background: cargoBadge[u.cargo] + '20', color: cargoBadge[u.cargo], padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{u.cargo}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: u.ativo ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Ações rápidas</h2>
          {['Gerar convite', 'Criar projeto', 'Ver relatórios', 'Gerenciar cargos'].map(a => (
            <button key={a} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#374151' }}>
              {a} →
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}