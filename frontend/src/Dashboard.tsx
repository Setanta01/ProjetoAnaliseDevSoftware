// frontend/src/Dashboard.tsx
// Versão atualizada com:
//   - Botão "Entrar com Google" (usando @react-oauth/google)
//   - Fluxo MFA Challenge quando o backend retorna mfa_required: true
//   - Botão de configurações MFA no sidebar

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

import MfaChallenge from './auth/MfaChallenge'
import MfaSettingsModal from './auth/MfaSettingsModal'
import type { MfaTipo } from './hooks/useMFA'

// ─── Importe os dashboards existentes ────────────────────────────────────────
import DashboardRouter from './dashboards/DashboardRouter'

// ─── Configuração ─────────────────────────────────────────────────────────────
const API_BASE         = 'http://localhost:8000/api'
// Substitua pelo seu Client ID do Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: number
  username: string
  email: string
  cargo: string
  mfa_ativo: boolean
  mfa_tipo: MfaTipo | null
  tem_google: boolean
}

type AppView = 'login' | 'dashboard'

interface MfaPending {
  mfa_token: string
  mfa_tipo: MfaTipo
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

// ─── App Principal ────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView]             = useState<AppView>('login')
  const [profile, setProfile]       = useState<UserProfile | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm]             = useState({ email: '', password: '', nome: '', regEmail: '' })
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [mfaPending, setMfaPending] = useState<MfaPending | null>(null)
  const [showMfaSettings, setShowMfaSettings] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('access_token')) fetchProfile()
  }, [])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const fetchProfile = async () => {
    try {
      const p = await apiFetch('/profile/')
      setProfile(p)
      setView('dashboard')
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  const salvarTokens = (tokens: { access: string; refresh: string }) => {
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
  }

  const handleMfaSuccess = async (tokens: { access: string; refresh: string }) => {
    salvarTokens(tokens)
    setMfaPending(null)
    await fetchProfile()
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setProfile(null)
    setView('login')
    setForm({ email: '', password: '', nome: '', regEmail: '' })
  }

  // ── Login normal ─────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setError(''); setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw data

      if (data.mfa_required) {
        // Redireciona para o challenge MFA
        setMfaPending({ mfa_token: data.mfa_token, mfa_tipo: data.mfa_tipo })
        return
      }

      salvarTokens(data)
      await fetchProfile()
    } catch (err: any) {
      setError(err?.detail ?? err?.error ?? 'Credenciais inválidas.')
    } finally { setLoading(false) }
  }

  // ── Registro ─────────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    setError(''); setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.regEmail, password: form.password,
          nome: form.nome, cargo: 'DEV',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw data
      setIsRegister(false)
      setError('✅ Conta criada! Faça login.')
    } catch (err: any) {
      setError(err?.error ?? err?.detail ?? 'Erro ao registrar.')
    } finally { setLoading(false) }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    const id_token = credentialResponse.credential
    if (!id_token) return

    setError(''); setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token }),
      })
      const data = await res.json()
      if (!res.ok) throw data

      if (data.mfa_required) {
        setMfaPending({ mfa_token: data.mfa_token, mfa_tipo: data.mfa_tipo })
        return
      }

      salvarTokens(data)
      await fetchProfile()
    } catch (err: any) {
      setError(err?.error ?? err?.detail ?? 'Erro ao entrar com Google.')
    } finally { setLoading(false) }
  }

  // ── MFA Challenge ─────────────────────────────────────────────────────────────

  if (mfaPending) {
    return (
      <MfaChallenge
        mfaTipo={mfaPending.mfa_tipo}
        mfaToken={mfaPending.mfa_token}
        onSuccess={handleMfaSuccess}
        onCancel={() => setMfaPending(null)}
      />
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  if (view === 'dashboard' && profile) {
    return (
      <>
        <DashboardRouter cargo={profile.cargo} />

        {/* Botão de settings MFA no sidebar — integre onde preferir */}
        <div style={{ position: 'fixed', bottom: 72, left: 0, width: 220, padding: '0 1rem' }}>
          <button
            onClick={() => setShowMfaSettings(true)}
            style={{
              width: '100%', background: 'none',
              border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 12px', cursor: 'pointer',
              fontSize: 13, color: '#374151', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span>{profile.mfa_ativo ? '🔐' : '🔓'}</span>
            {profile.mfa_ativo ? 'MFA ativo' : 'Ativar MFA'}
          </button>
        </div>

        <section id="center">
          <button onClick={handleLogout}>Sair</button>
        </section>

        {showMfaSettings && (
          <MfaSettingsModal onClose={() => {
            setShowMfaSettings(false)
            fetchProfile() // Atualiza status do MFA no profile
          }} />
        )}
      </>
    )
  }

  // ── Tela de Login / Registro ──────────────────────────────────────────────────

  const inputStyle: CSSProperties = {
    padding: '11px 14px', borderRadius: 10, border: '1px solid #D1D5DB',
    fontSize: 14, color: '#111827', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)',
        fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '1rem',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB',
          padding: '2.5rem', width: '100%', maxWidth: 380,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#111827' }}>Lazuli</span>
          </div>

          <h2 style={{ margin: '0 0 1.5rem', fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {isRegister ? 'Criar conta' : 'Entrar'}
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
              background: error.startsWith('✅') ? '#D1FAE5' : '#FEE2E2',
              color:      error.startsWith('✅') ? '#065F46'  : '#991B1B',
            }}>{error}</div>
          )}

          {/* Formulário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isRegister && (
              <input
                placeholder="Nome completo"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                style={inputStyle}
              />
            )}
            <input
              placeholder="Email"
              type="email"
              value={isRegister ? form.regEmail : form.email}
              onChange={e => setForm(isRegister ? { ...form, regEmail: e.target.value } : { ...form, email: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Senha"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') isRegister ? handleRegister() : handleLogin() }}
              style={inputStyle}
            />

            <button
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={loading}
              style={{
                padding: '12px', background: loading ? '#93C5FD' : '#2563EB',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
              }}
            >
              {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
            </button>

            {/* Divisor */}
            {!isRegister && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                </div>

                {/* Botão Google */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {GOOGLE_CLIENT_ID ? (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Falha ao autenticar com Google.')}
                      text="signin_with"
                      shape="rectangular"
                      size="large"
                      width="332"
                    />
                  ) : (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 12,
                      background: '#FEF3C7', color: '#92400E', textAlign: 'center',
                    }}>
                      Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o login com Google.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: '#6B7280' }}>
            {isRegister ? 'Já tem conta? ' : 'Não tem conta? '}
            <span
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
            >
              {isRegister ? 'Fazer login' : 'Cadastre-se'}
            </span>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}