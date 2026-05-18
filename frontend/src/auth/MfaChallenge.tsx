// frontend/src/auth/MfaChallenge.tsx
// Tela exibida após login com senha quando MFA está ativo.
// O usuário digita o código TOTP ou OTP de e-mail.

import { useState } from 'react'
import type { MfaTipo } from '../hooks/useMFA'
import { useMFA } from '../hooks/useMFA'

interface Props {
  mfaTipo: MfaTipo
  mfaToken: string
  onSuccess: (tokens: { access: string; refresh: string }) => void
  onCancel: () => void
}

export default function MfaChallenge({ mfaTipo, mfaToken, onSuccess, onCancel }: Props) {
  const [code, setCode]           = useState('')
  const [reenvioOk, setReenvioOk] = useState(false)
  const { loading, error, challenge, resendEmail } = useMFA()

  const handleSubmit = async () => {
    if (code.length < 6) return
    const result = await challenge(mfaToken, code)
    if (result) onSuccess(result as { access: string; refresh: string })
  }

  const handleReenvio = async () => {
    const result = await resendEmail(mfaToken)
    if (result) setReenvioOk(true)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Ícone */}
        <div style={styles.iconWrap}>
          <span style={{ fontSize: 28 }}>{mfaTipo === 'TOTP' ? '🔐' : '📧'}</span>
        </div>

        <h2 style={styles.title}>Verificação em duas etapas</h2>
        <p style={styles.sub}>
          {mfaTipo === 'TOTP'
            ? 'Abra o Google Authenticator (ou Authy) e insira o código de 6 dígitos.'
            : `Insira o código enviado para seu e-mail.`}
        </p>

        {/* Input do código */}
        <input
          style={styles.codeInput}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />

        {error && <p style={styles.error}>{error}</p>}
        {reenvioOk && <p style={styles.success}>Novo código enviado!</p>}

        <button
          style={{ ...styles.btn, opacity: loading || code.length < 6 ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading || code.length < 6}
        >
          {loading ? 'Verificando...' : 'Confirmar'}
        </button>

        {mfaTipo === 'EMAIL' && (
          <button style={styles.link} onClick={handleReenvio} disabled={loading}>
            Reenviar código
          </button>
        )}

        <button style={{ ...styles.link, color: '#9CA3AF' }} onClick={onCancel}>
          ← Voltar ao login
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB',
    padding: '2.5rem', width: '100%', maxWidth: 380,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 14,
    background: '#EFF6FF', border: '1px solid #BFDBFE',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', textAlign: 'center' },
  sub: { margin: 0, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.5 },
  codeInput: {
    width: '100%', padding: '14px', textAlign: 'center',
    fontSize: 28, fontWeight: 700, letterSpacing: 12,
    border: '2px solid #D1D5DB', borderRadius: 12,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'monospace',
  },
  btn: {
    width: '100%', padding: '12px',
    background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  link: {
    background: 'none', border: 'none',
    color: '#2563EB', fontSize: 13, cursor: 'pointer',
    padding: '4px 0', fontWeight: 500,
  },
  error:   { color: '#991B1B', background: '#FEE2E2', padding: '8px 14px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box' },
  success: { color: '#065F46', background: '#D1FAE5', padding: '8px 14px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box' },
}