import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '@/api'
import { BrandMark } from '@/components/app/BrandMark'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-background flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[580px] shadow-md">
        <CardHeader className="items-center space-y-6 p-10 pb-5">
          <BrandMark />
          <div className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-10 pt-2">
          {children}
        </CardContent>
      </Card>
    </main>
  )
}

function BackToLogin() {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      <Link className="font-medium text-primary hover:underline" to="/login">Voltar ao login</Link>
    </p>
  )
}

export function PasswordRecoveryRequestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return setError('E-mail é obrigatório.')
    
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/recuperar-senha/', { email: email.trim() })
      setSuccess(true)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao solicitar recuperação.'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Recuperação de Senha" subtitle="Verifique seu e-mail">
        <Alert variant="info">
          Se o e-mail existir no sistema, você receberá um link com as instruções para redefinir sua senha.
        </Alert>
        <BackToLogin />
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Recuperação de Senha" subtitle="Informe seu e-mail para receber um link de redefinição.">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="recovery-email">E-mail</Label>
          <Input 
            id="recovery-email" 
            className="h-12"
            type="email" 
            placeholder="exemplo@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            disabled={loading}
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? 'Aguarde...' : 'Enviar instruções'}
        </Button>
        <BackToLogin />
      </form>
    </AuthCard>
  )
}

export function PasswordResetPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return setError('Token inválido ou ausente.')
    if (!password) return setError('A senha é obrigatória.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/redefinir-senha/', { token, nova_senha: password })
      setSuccess(true)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Não foi possível redefinir a senha. O link pode ter expirado.'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Senha redefinida" subtitle="Sua senha foi atualizada com sucesso!">
        <Button className="w-full h-12 mt-4" onClick={() => navigate('/login')}>
          Acessar minha conta
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Redefinir Senha" subtitle="Crie uma nova senha para sua conta.">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input 
            id="new-password" 
            className="h-12"
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            disabled={loading}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar senha</Label>
          <Input 
            id="confirm-password" 
            className="h-12"
            type="password" 
            placeholder="••••••••" 
            value={confirm} 
            onChange={(e) => setConfirm(e.target.value)} 
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full h-12" disabled={loading || !token}>
          {loading ? 'Redefinindo...' : 'Salvar nova senha'}
        </Button>
        <BackToLogin />
      </form>
    </AuthCard>
  )
}
