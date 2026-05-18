// frontend/src/hooks/useMFA.ts
// Hook central para tudo relacionado a MFA e Google OAuth

import { useState } from 'react'
import api from '../api'

export type MfaTipo = 'TOTP' | 'EMAIL'

// ─── Tipos de retorno da API ──────────────────────────────────────────────────

export interface MfaStatus {
  mfa_ativo: boolean
  mfa_tipo: MfaTipo | null
}

export interface SetupTotpResult {
  secret: string
  qrcode: string  // base64 PNG
  uri: string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMFA() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const run = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setError(null)
    setLoading(true)
    try {
      return await fn()
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Erro desconhecido'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  // ── Status ──────────────────────────────────────────────────────────────────
  const getStatus = () =>
    run<MfaStatus>(() => api.get('/mfa/status/').then(r => r.data))

  // ── Setup TOTP ───────────────────────────────────────────────────────────────
  const setupTotp = () =>
    run<SetupTotpResult>(() => api.post('/mfa/setup/totp/').then(r => r.data))

  const verifyTotp = (code: string) =>
    run<{ message: string }>(() => api.post('/mfa/verify/totp/', { code }).then(r => r.data))

  // ── Setup Email ──────────────────────────────────────────────────────────────
  const setupEmail = () =>
    run<{ message: string }>(() => api.post('/mfa/setup/email/').then(r => r.data))

  const verifyEmail = (code: string) =>
    run<{ message: string }>(() => api.post('/mfa/verify/email/', { code }).then(r => r.data))

  // ── Challenge (login MFA) ────────────────────────────────────────────────────
  const challenge = (mfa_token: string, code: string) =>
    run<{ access: string; refresh: string }>(() =>
      api.post('/mfa/challenge/', { mfa_token, code }).then(r => r.data)
    )

  const resendEmail = (mfa_token: string) =>
    run<{ message: string }>(() => api.post('/mfa/resend-email/', { mfa_token }).then(r => r.data))

  // ── Desativar ────────────────────────────────────────────────────────────────
  const disable = (password: string) =>
    run<{ message: string }>(() =>
      api.delete('/mfa/disable/', { data: { password } }).then(r => r.data)
    )

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const googleLogin = (id_token: string) =>
    run<
      | { access: string; refresh: string }
      | { mfa_required: true; mfa_tipo: MfaTipo; mfa_token: string }
    >(() => api.post('/auth/google/', { id_token }).then(r => r.data))

  return {
    loading,
    error,
    getStatus,
    setupTotp,
    verifyTotp,
    setupEmail,
    verifyEmail,
    challenge,
    resendEmail,
    disable,
    googleLogin,
  }
}