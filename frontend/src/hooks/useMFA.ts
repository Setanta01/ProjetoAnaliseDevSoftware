import { useCallback, useState } from 'react'
import api from '@/api'
import { getErrorMessage } from '@/lib/errors'

export type MfaTipo = 'TOTP' | 'EMAIL'

export interface MfaStatus {
  mfa_ativo: boolean
  mfa_tipo: MfaTipo | null
}

export interface SetupTotpResult {
  secret: string
  qrcode: string
  uri: string
}

export function useMFA() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    setError(null)
    setLoading(true)
    try {
      return await operation()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro desconhecido'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getStatus = useCallback(
    () => run<MfaStatus>(() => api.get('/mfa/status/').then((response) => response.data)),
    [run],
  )

  return {
    loading,
    error,
    getStatus,
    setupTotp: () => run<SetupTotpResult>(() => api.post('/mfa/setup/totp/').then((response) => response.data)),
    verifyTotp: (code: string) => run<{ message: string }>(() => api.post('/mfa/verify/totp/', { code }).then((response) => response.data)),
    setupEmail: () => run<{ message: string }>(() => api.post('/mfa/setup/email/').then((response) => response.data)),
    verifyEmail: (code: string) => run<{ message: string }>(() => api.post('/mfa/verify/email/', { code }).then((response) => response.data)),
    challenge: (mfaToken: string, code: string) => run<{ access: string; refresh: string }>(() => api.post('/mfa/challenge/', { mfa_token: mfaToken, code }).then((response) => response.data)),
    resendEmail: (mfaToken: string) => run<{ message: string }>(() => api.post('/mfa/resend-email/', { mfa_token: mfaToken }).then((response) => response.data)),
    disable: (password: string) => run<{ message: string }>(() => api.delete('/mfa/disable/', { data: { password } }).then((response) => response.data)),
    googleLogin: (idToken: string) => run<
      { access: string; refresh: string } | { mfa_required: true; mfa_tipo: MfaTipo; mfa_token: string }
    >(() => api.post('/auth/google/', { id_token: idToken }).then((response) => response.data)),
  }
}
