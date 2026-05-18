// frontend/src/auth/MfaSettingsModal.tsx
// Modal acessível pelas configurações do usuário para ativar / desativar MFA.
// Suporta TOTP (QR code) e Email OTP.

import { useState, useEffect } from 'react'
import { X, Shield, ShieldCheck, ShieldOff, Smartphone, Mail } from 'lucide-react'
import { useMFA } from '../hooks/useMFA'
import type { MfaTipo, MfaStatus, SetupTotpResult } from '../hooks/useMFA'

interface Props {
  onClose: () => void
}

type Step =
  | 'menu'
  | 'choose-type'
  | 'setup-totp'
  | 'setup-email'
  | 'verify'
  | 'disable'
  | 'done'

export default function MfaSettingsModal({ onClose }: Props) {
  const { loading, error, getStatus, setupTotp, verifyTotp, setupEmail, verifyEmail, disable } = useMFA()

  const [step, setStep]           = useState<Step>('menu')
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null)
  const [setupType, setSetupType] = useState<MfaTipo | null>(null)
  const [totpData, setTotpData]   = useState<SetupTotpResult | null>(null)
  const [code, setCode]           = useState('')
  const [password, setPassword]   = useState('')
  const [message, setMessage]     = useState('')
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    getStatus().then(s => { if (s) setMfaStatus(s) })
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSetupTotp = async () => {
    const data = await setupTotp()
    if (data) {
      setTotpData(data)
      setSetupType('TOTP')
      setStep('setup-totp')
    }
  }

  const handleSetupEmail = async () => {
    const result = await setupEmail()
    if (result) {
      setSetupType('EMAIL')
      setStep('setup-email')
    }
  }

  const handleVerify = async () => {
    let result = null
    if (setupType === 'TOTP')  result = await verifyTotp(code)
    if (setupType === 'EMAIL') result = await verifyEmail(code)
    if (result) {
      setMfaStatus({ mfa_ativo: true, mfa_tipo: setupType })
      setMessage(result.message)
      setStep('done')
    }
  }

  const handleDisable = async () => {
    const result = await disable(password)
    if (result) {
      setMfaStatus({ mfa_ativo: false, mfa_tipo: null })
      setMessage(result.message)
      setStep('done')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#2563EB" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
              Autenticação em dois fatores
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Conteúdo */}
        <div style={styles.body}>

          {/* ── MENU ─────────────────────────────────────────────────────── */}
          {step === 'menu' && (
            <>
              {mfaStatus === null ? (
                <p style={styles.sub}>Carregando status...</p>
              ) : mfaStatus.mfa_ativo ? (
                <>
                  <div style={styles.statusBadge('green')}>
                    <ShieldCheck size={16} />
                    MFA ativo via {mfaStatus.mfa_tipo === 'TOTP' ? 'Authenticator App' : 'E-mail'}
                  </div>
                  <p style={styles.sub}>
                    Sua conta está protegida com verificação em dois fatores.
                  </p>
                  <button style={styles.btnDanger} onClick={() => setStep('disable')}>
                    <ShieldOff size={14} /> Desativar MFA
                  </button>
                </>
              ) : (
                <>
                  <div style={styles.statusBadge('gray')}>
                    <Shield size={16} />
                    MFA desativado
                  </div>
                  <p style={styles.sub}>
                    Adicione uma camada extra de segurança à sua conta escolhendo um método abaixo.
                  </p>
                  <button style={styles.btnPrimary} onClick={() => setStep('choose-type')}>
                    Ativar MFA
                  </button>
                </>
              )}
            </>
          )}

          {/* ── ESCOLHER TIPO ─────────────────────────────────────────────── */}
          {step === 'choose-type' && (
            <>
              <p style={styles.sub}>Escolha como você quer receber os códigos:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button style={styles.optionBtn} onClick={handleSetupTotp} disabled={loading}>
                  <Smartphone size={20} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Authenticator App</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      Google Authenticator, Authy, 1Password…
                    </div>
                  </div>
                </button>
                <button style={styles.optionBtn} onClick={handleSetupEmail} disabled={loading}>
                  <Mail size={20} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Código por e-mail</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      Receba um código de 6 dígitos no seu e-mail.
                    </div>
                  </div>
                </button>
              </div>
              <button style={styles.btnBack} onClick={() => setStep('menu')}>← Voltar</button>
            </>
          )}

          {/* ── SETUP TOTP ────────────────────────────────────────────────── */}
          {step === 'setup-totp' && totpData && (
            <>
              <p style={styles.sub}>
                Escaneie o QR code com o app Authenticator:
              </p>
              <img
                src={`data:image/png;base64,${totpData.qrcode}`}
                alt="QR Code TOTP"
                style={{ width: 180, height: 180, borderRadius: 12, border: '1px solid #E5E7EB', display: 'block', margin: '0 auto' }}
              />
              <button style={styles.btnBack} onClick={() => setShowSecret(s => !s)}>
                {showSecret ? 'Ocultar chave manual' : 'Digitar manualmente'}
              </button>
              {showSecret && (
                <div style={styles.secretBox}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>
                    {totpData.secret}
                  </span>
                </div>
              )}
              <p style={{ ...styles.sub, marginTop: 8 }}>
                Depois de escanear, insira o código gerado pelo app:
              </p>
              <input
                style={styles.codeInput}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={{ ...styles.btnPrimary, opacity: code.length < 6 ? 0.6 : 1 }}
                onClick={handleVerify}
                disabled={loading || code.length < 6}
              >
                {loading ? 'Verificando...' : 'Confirmar e ativar'}
              </button>
              <button style={styles.btnBack} onClick={() => setStep('choose-type')}>← Voltar</button>
            </>
          )}

          {/* ── SETUP EMAIL ───────────────────────────────────────────────── */}
          {step === 'setup-email' && (
            <>
              <div style={styles.statusBadge('blue')}>
                <Mail size={14} /> Código enviado para seu e-mail
              </div>
              <p style={styles.sub}>Insira o código de 6 dígitos recebido:</p>
              <input
                style={styles.codeInput}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                autoFocus
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={{ ...styles.btnPrimary, opacity: code.length < 6 ? 0.6 : 1 }}
                onClick={handleVerify}
                disabled={loading || code.length < 6}
              >
                {loading ? 'Verificando...' : 'Confirmar e ativar'}
              </button>
              <button style={styles.btnBack} onClick={() => { setupEmail(); setCode('') }}>
                Reenviar código
              </button>
              <button style={styles.btnBack} onClick={() => setStep('choose-type')}>← Voltar</button>
            </>
          )}

          {/* ── DESATIVAR ─────────────────────────────────────────────────── */}
          {step === 'disable' && (
            <>
              <p style={styles.sub}>
                Para desativar o MFA, confirme sua senha:
              </p>
              <input
                style={styles.input}
                type="password"
                placeholder="Sua senha atual"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDisable()}
                autoFocus
              />
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.btnDanger} onClick={handleDisable} disabled={loading || !password}>
                {loading ? 'Desativando...' : 'Confirmar desativação'}
              </button>
              <button style={styles.btnBack} onClick={() => setStep('menu')}>← Voltar</button>
            </>
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <span style={{ fontSize: 48 }}>
                  {mfaStatus?.mfa_ativo ? '🔐' : '🔓'}
                </span>
                <p style={{ ...styles.sub, marginTop: 12 }}>{message}</p>
              </div>
              <button style={styles.btnPrimary} onClick={onClose}>Fechar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles: Record<string, any> = {
  overlay: {
    position: 'fixed' as const, inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: '1rem',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
    width: '100%', maxWidth: 420,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F6',
    background: '#FAFAFA',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#9CA3AF', padding: 4, borderRadius: 6,
  },
  body: {
    padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12,
  },
  sub: { margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  statusBadge: (color: 'green' | 'gray' | 'blue') => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    ...(color === 'green' ? { background: '#D1FAE5', color: '#065F46' }
      : color === 'blue'  ? { background: '#DBEAFE', color: '#1D4ED8' }
      :                     { background: '#F3F4F6', color: '#374151' }),
  }),
  btnPrimary: {
    width: '100%', padding: '11px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    width: '100%', padding: '11px', background: '#FEE2E2', color: '#991B1B',
    border: '1px solid #FECACA', borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnBack: {
    background: 'none', border: 'none', color: '#6B7280', fontSize: 13,
    cursor: 'pointer', textAlign: 'center', padding: '4px 0',
  },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: 12, cursor: 'pointer', textAlign: 'left',
    transition: 'border-color 0.15s',
  },
  codeInput: {
    width: '100%', padding: '14px', textAlign: 'center',
    fontSize: 28, fontWeight: 700, letterSpacing: 12,
    border: '2px solid #D1D5DB', borderRadius: 12,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
  },
  input: {
    width: '100%', padding: '11px 14px',
    border: '1px solid #D1D5DB', borderRadius: 10,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  secretBox: {
    background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '10px 14px', wordBreak: 'break-all' as const,
    display: 'flex', justifyContent: 'center',
  },
  error: {
    color: '#991B1B', background: '#FEE2E2',
    padding: '8px 12px', borderRadius: 8, fontSize: 13, margin: 0,
  },
}