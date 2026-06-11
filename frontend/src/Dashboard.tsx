import { useCallback, useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/app/BrandMark'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DemoWorkspace } from '@/demo/DemoWorkspace'
import { demoProfiles, type DemoProfile } from '@/demo/data'
import MfaChallenge from '@/auth/MfaChallenge'
import { FirstAdminSetupPage, InviteActivationPage } from '@/auth/RegistrationPages'
import type { MfaTipo } from '@/hooks/useMFA'
import { getErrorMessage } from '@/lib/errors'
import { apiBaseUrl, isDemoMode, requiresInitialAdmin } from '@/lib/env'
import type { Cargo } from '@/types'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

interface UserProfile {
  id: number
  username: string
  email: string
  cargo: Cargo
  mfa_ativo: boolean
  mfa_tipo: MfaTipo | null
  tem_google: boolean
}

interface AuthTokens {
  access: string
  refresh: string
}

interface MfaPending {
  mfa_token: string
  mfa_tipo: MfaTipo
}

interface LoginResponse extends Partial<AuthTokens> {
  mfa_required?: boolean
  mfa_token?: string
  mfa_tipo?: MfaTipo
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  const data: unknown = await response.json()
  if (!response.ok) throw data
  return data as T
}

function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('access_token', tokens.access)
  localStorage.setItem('refresh_token', tokens.refresh)
}

function AuthPage({ onAuthenticated, onEnterDemo }: { onAuthenticated: (profile: UserProfile) => void; onEnterDemo: () => void }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'destructive' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [mfaPending, setMfaPending] = useState<MfaPending | null>(null)

  const fetchProfile = useCallback(async () => {
    const profile = await apiFetch<UserProfile>('/profile/')
    onAuthenticated(profile)
  }, [onAuthenticated])

  const completeLogin = async (tokens: AuthTokens) => {
    saveTokens(tokens)
    setMfaPending(null)
    await fetchProfile()
  }

  const handleAuthResponse = async (data: LoginResponse) => {
    if (data.mfa_required && data.mfa_token && data.mfa_tipo) {
      setMfaPending({ mfa_token: data.mfa_token, mfa_tipo: data.mfa_tipo })
      return
    }
    if (!data.access || !data.refresh) throw new Error('Resposta de autenticação inválida.')
    await completeLogin({ access: data.access, refresh: data.refresh })
  }

  const handleLogin = async () => {
    setFeedback(null)
    setLoading(true)
    try {
      const data = await apiFetch<LoginResponse>('/token/', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      await handleAuthResponse(data)
    } catch (error) {
      setFeedback({ message: getErrorMessage(error, 'Credenciais inválidas.'), tone: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) return
    setFeedback(null)
    setLoading(true)
    try {
      const data = await apiFetch<LoginResponse>('/auth/google/', {
        method: 'POST',
        body: JSON.stringify({ id_token: credential }),
      })
      await handleAuthResponse(data)
    } catch (error) {
      setFeedback({ message: getErrorMessage(error, 'Erro ao entrar com Google.'), tone: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (mfaPending) {
    return (
      <MfaChallenge
        mfaTipo={mfaPending.mfa_tipo}
        mfaToken={mfaPending.mfa_token}
        onSuccess={completeLogin}
        onCancel={() => setMfaPending(null)}
      />
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <main className="auth-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-[580px] shadow-md">
          <CardHeader className="items-center space-y-6 p-10 pb-5">
            <BrandMark />
            <CardTitle className="sr-only">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-10 pt-2">
            {isDemoMode && (
              <Button type="button" variant="secondary" className="w-full text-primary" onClick={onEnterDemo}>Entrar no modo demonstração</Button>
            )}
            {feedback && <Alert variant={feedback.tone}>{feedback.message}</Alert>}
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                void handleLogin()
              }}
            >
              <div className="space-y-2"><Label htmlFor="login-email">E-mail</Label><Input id="login-email" className="h-12" placeholder="exemplo@email.com" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="login-password">Senha</Label><Input id="login-password" className="h-12" placeholder="••••••••" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></div>
              <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2"><Checkbox /> Manter conectado</label><button type="button" className="font-medium text-primary hover:underline">Esqueceu a senha?</button></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Aguarde...' : 'Entrar'}
              </Button>
            </form>

            {!isDemoMode && (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                  ou
                </div>
                <div className="flex justify-center">
                  {GOOGLE_CLIENT_ID ? (
                    <GoogleLogin
                      onSuccess={(response) => void handleGoogleSuccess(response.credential)}
                      onError={() => setFeedback({ message: 'Falha ao autenticar com Google.', tone: 'destructive' })}
                      text="signin_with"
                      shape="rectangular"
                      size="large"
                      width="316"
                    />
                  ) : (
                    <Alert variant="warning" className="text-center text-xs">
                      Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o login com Google.
                    </Alert>
                  )}
                </div>
              </>
            )}

            {isDemoMode && <div className="flex justify-center gap-5 border-t border-border pt-4 text-xs"><a className="text-primary hover:underline" href="/setup-admin">Ver primeiro acesso</a><a className="text-primary hover:underline" href="/activate-invite?token=demo">Ver cadastro por convite</a></div>}
          </CardContent>
        </Card>
      </main>
    </GoogleOAuthProvider>
  )
}

export default function App() {
  const navigate = useNavigate()
  const savedDemoRole = localStorage.getItem('lazuli_demo_role') as Cargo | null
  const [profile, setProfile] = useState<UserProfile | null>(isDemoMode && savedDemoRole && demoProfiles[savedDemoRole] ? demoProfiles[savedDemoRole] : null)
  const [initialAdminCreated, setInitialAdminCreated] = useState(localStorage.getItem('lazuli_initial_admin_created') === 'true')
  const [checkingSession, setCheckingSession] = useState(!isDemoMode && Boolean(localStorage.getItem('access_token')))
  const needsInitialAdmin = requiresInitialAdmin && !initialAdminCreated

  const handleAuthenticated = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile)
    navigate('/app', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (isDemoMode) return
    if (!localStorage.getItem('access_token')) return
    apiFetch<UserProfile>('/profile/')
      .then(handleAuthenticated)
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login', { replace: true })
      })
      .finally(() => setCheckingSession(false))
  }, [handleAuthenticated, navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('lazuli_demo_role')
    setProfile(null)
    navigate('/login', { replace: true })
  }

  const enterDemo = () => {
    const demoProfile = demoProfiles.DEV
    localStorage.setItem('lazuli_demo_role', demoProfile.cargo)
    setProfile(demoProfile)
    navigate('/app/projects', { replace: true })
  }

  if (checkingSession) {
    return <div className="auth-background min-h-screen" />
  }

  return (
    <Routes>
      <Route path="/login" element={needsInitialAdmin ? <Navigate to="/setup-admin" replace /> : profile ? <Navigate to={isDemoMode ? '/app/projects' : '/app'} replace /> : <AuthPage onAuthenticated={handleAuthenticated} onEnterDemo={enterDemo} />} />
      <Route path="/setup-admin" element={<FirstAdminSetupPage onComplete={() => { localStorage.setItem('lazuli_initial_admin_created', 'true'); setInitialAdminCreated(true); navigate('/login', { replace: true }) }} />} />
      <Route path="/activate-invite" element={<InviteActivationPage onComplete={() => navigate('/login', { replace: true })} />} />
      {isDemoMode ? (
        <Route
          path="/app/*"
          element={profile ? (
            <DemoWorkspace
              initialProfile={profile as DemoProfile}
              onProfileChange={setProfile}
              onExit={handleLogout}
            />
          ) : <Navigate to="/login" replace />}
        />
      ) : (
        <Route path="/app/*" element={profile ? <DemoWorkspace initialProfile={profile as DemoProfile} onProfileChange={setProfile} onExit={handleLogout} demoMode={false} /> : <Navigate to="/login" replace />} />
      )}
      <Route path="*" element={<Navigate to={needsInitialAdmin ? '/setup-admin' : profile ? (isDemoMode ? '/app/projects' : '/app') : '/login'} replace />} />
    </Routes>
  )
}
