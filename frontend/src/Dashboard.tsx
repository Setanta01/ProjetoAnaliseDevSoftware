import { useCallback, useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Route, Routes, useNavigate, Link } from 'react-router-dom'
import api from '@/api'
import { BrandMark } from '@/components/app/BrandMark'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DemoWorkspace } from '@/demo/DemoWorkspace'
import { demoProfiles } from '@/demo/data'
import MfaChallenge from '@/auth/MfaChallenge'
import { FirstAdminSetupPage, InviteActivationPage } from '@/auth/RegistrationPages'
import { PasswordRecoveryRequestPage, PasswordResetPage } from '@/auth/PasswordRecoveryPages'
import type { MfaTipo } from '@/hooks/useMFA'
import { AUTHENTICATED_HOME, getSessionRestoreDestination } from '@/lib/auth-routing'
import { getErrorMessage } from '@/lib/errors'
import { isDemoMode } from '@/lib/env'
import type { Cargo, UserProfile } from '@/types'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

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

interface BootstrapStatus {
  bootstrap_disponivel: boolean
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
    const profile = await api.get<UserProfile>('/auth/profile/').then((response) => response.data)
    onAuthenticated(profile)
  }, [onAuthenticated])

  const completeLogin = async (tokens: AuthTokens) => {
    saveTokens(tokens)
    setMfaPending(null)
    try {
      await fetchProfile()
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      throw error
    }
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
      const data = await api.post<LoginResponse>('/auth/login/', {
        email: form.email,
        senha: form.password,
      }).then((response) => response.data)
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
      const data = await api.post<LoginResponse>('/auth/google/', { id_token: credential }).then((response) => response.data)
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
              <div className="flex items-center justify-end text-sm"><Link to="/recuperar-senha" className="font-medium text-primary hover:underline">Esqueceu a senha?</Link></div>
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
  const [checkingSession, setCheckingSession] = useState(!isDemoMode && Boolean(localStorage.getItem('access_token')))
  const bootstrapQuery = useQuery({
    queryKey: ['auth-bootstrap-status'],
    queryFn: () => api.get<BootstrapStatus>('/auth/bootstrap-status/').then((response) => response.data),
    enabled: !isDemoMode,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const needsInitialAdmin = !isDemoMode && bootstrapQuery.data?.bootstrap_disponivel === true

  const handleAuthenticated = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile)
    navigate(AUTHENTICATED_HOME, { replace: true })
  }, [navigate])

  useEffect(() => {
    if (isDemoMode) return
    if (!localStorage.getItem('access_token')) return
    api.get<UserProfile>('/auth/profile/').then((response) => response.data)
      .then((restoredProfile) => {
        setProfile(restoredProfile)
        const destination = getSessionRestoreDestination(window.location.pathname)
        if (destination) navigate(destination, { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login', { replace: true })
      })
      .finally(() => setCheckingSession(false))
  }, [navigate])

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token')
    try {
      if (!isDemoMode && refresh) await api.post('/auth/logout/', { refresh })
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('lazuli_demo_role')
      setProfile(null)
      navigate('/login', { replace: true })
    }
  }

  const enterDemo = () => {
    const demoProfile = demoProfiles.DEV
    localStorage.setItem('lazuli_demo_role', demoProfile.cargo)
    setProfile(demoProfile)
    navigate(AUTHENTICATED_HOME, { replace: true })
  }

  if (checkingSession || (!isDemoMode && bootstrapQuery.isLoading)) {
    return (
      <main className="auth-background flex min-h-screen items-center justify-center p-4" aria-label="Carregando aplicação" aria-busy="true">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="items-center space-y-5 p-8 pb-4">
            <BrandMark />
            <CardTitle className="sr-only">Carregando Lazuli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-8 pt-4">
            <Skeleton className="mx-auto h-4 w-2/3" />
            <Skeleton className="mx-auto h-4 w-1/2" />
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isDemoMode && bootstrapQuery.isError) {
    return (
      <main className="auth-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="font-semibold text-foreground">Não foi possível verificar a inicialização do sistema.</p>
            <p className="text-sm text-muted-foreground">Confirme se o backend e o banco de dados estão em execução.</p>
            <Button onClick={() => void bootstrapQuery.refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={needsInitialAdmin ? <Navigate to="/setup-admin" replace /> : profile ? <Navigate to={AUTHENTICATED_HOME} replace /> : <AuthPage onAuthenticated={handleAuthenticated} onEnterDemo={enterDemo} />} />
      <Route path="/setup-admin" element={(isDemoMode || needsInitialAdmin) ? <FirstAdminSetupPage onComplete={async () => { await bootstrapQuery.refetch(); navigate('/login', { replace: true }) }} /> : <Navigate to="/login" replace />} />
      <Route path="/activate-invite" element={<InviteActivationPage onComplete={() => navigate('/login', { replace: true })} />} />
      <Route path="/ativar-convite" element={<InviteActivationPage onComplete={() => navigate('/login', { replace: true })} />} />
      <Route path="/recuperar-senha" element={<PasswordRecoveryRequestPage />} />
      <Route path="/redefinir-senha" element={<PasswordResetPage />} />
      {isDemoMode ? (
        <Route
          path="/app/*"
          element={profile ? (
            <DemoWorkspace
              initialProfile={profile}
              onProfileChange={(nextProfile) => setProfile(nextProfile)}
              onExit={() => void handleLogout()}
            />
          ) : <Navigate to="/login" replace />}
        />
      ) : (
        <Route path="/app/*" element={profile ? <DemoWorkspace initialProfile={profile} onProfileChange={(nextProfile) => setProfile(nextProfile)} onExit={() => void handleLogout()} demoMode={false} /> : <Navigate to="/login" replace />} />
      )}
      <Route path="*" element={<Navigate to={needsInitialAdmin ? '/setup-admin' : profile ? AUTHENTICATED_HOME : '/login'} replace />} />
    </Routes>
  )
}
