export default function QADashboard() {
  const paraRevisar = [
    { titulo: 'Implementar login JWT', responsavel: 'Carlos Dev', prioridade: 'ALTA', sprint: 'Sprint 3' },
    { titulo: 'Endpoint de perfil', responsavel: 'Ana Back', prioridade: 'MEDIA', sprint: 'Sprint 3' },
  ]

  const historico = [
    { titulo: 'Tela de cadastro', resultado: 'APROVADO', data: 'hoje' },
    { titulo: 'Validação de formulário', resultado: 'REPROVADO', data: 'ontem' },
    { titulo: 'Reset de senha', resultado: 'APROVADO', data: 'ontem' },
  ]

  const prioridadeColor: Record<string, string> = {
    BAIXA: '#16a34a',
    MEDIA: '#0891b2',
    ALTA: '#d97706',
    CRITICA: '#dc2626',
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Painel QA</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Tasks aguardando revisão</p>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'Para revisar', value: 2, color: '#d97706' },
          { label: 'Aprovadas hoje', value: 1, color: '#16a34a' },
          { label: 'Reprovadas hoje', value: 1, color: '#dc2626' },
        ].map(r => (
          <div key={r.label} style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: r.color }}>{r.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Para revisar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Aguardando revisão</h2>
        {paraRevisar.map(t => (
          <div key={t.titulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{t.titulo}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.responsavel} · {t.sprint}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: prioridadeColor[t.prioridade] + '20', color: prioridadeColor[t.prioridade] }}>{t.prioridade}</span>
              <button style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontWeight: 600 }}>✓ Aprovar</button>
              <button style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>✗ Reprovar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600 }}>Histórico de revisões</h2>
        {historico.map(h => (
          <div key={h.titulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{h.titulo}</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{h.data}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: h.resultado === 'APROVADO' ? '#dcfce7' : '#fee2e2', color: h.resultado === 'APROVADO' ? '#16a34a' : '#dc2626' }}>{h.resultado}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}