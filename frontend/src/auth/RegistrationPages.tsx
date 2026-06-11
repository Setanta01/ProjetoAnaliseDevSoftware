import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/api'
import { BrandMark } from '@/components/app/BrandMark'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RegistrationPageProps { onComplete: () => void }

export function FirstAdminSetupPage({ onComplete }: RegistrationPageProps) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.password) return setError('Preencha todos os campos obrigatórios.')
    if (form.password !== form.confirm) return setError('As senhas não coincidem.')
    onComplete()
  }
  return <AuthRegistrationCard title="Criar conta administradora" subtitle="Configure o primeiro administrador para iniciar o sistema."><form className="space-y-4" onSubmit={submit}>{error && <Alert variant="destructive">{error}</Alert>}<Field label="Nome completo"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome do administrador" /></Field><Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@empresa.com" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Senha"><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field><Field label="Confirmar senha"><Input type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} /></Field></div><Button className="w-full" type="submit">Criar administrador e iniciar</Button><BackToLogin /></form></AuthRegistrationCard>
}

export function InviteActivationPage({ onComplete }: RegistrationPageProps) {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ name: 'Novo Colaborador', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.password) return setError('Defina uma senha para ativar a conta.')
    if (form.password !== form.confirm) return setError('As senhas não coincidem.')
    const token = searchParams.get('token')
    if (!token) return setError('O token do convite está ausente ou inválido.')
    setLoading(true)
    try {
      await api.post('/auth/ativar-convite/', { token, senha: form.password, confirmar_senha: form.confirm, nome: form.name })
      onComplete()
    } catch {
      setError('Não foi possível ativar o convite. Verifique se o link ainda é válido.')
    } finally {
      setLoading(false)
    }
  }
  return <AuthRegistrationCard title="Ativar convite" subtitle="Complete seu cadastro para entrar na equipe Lazuli."><form className="space-y-4" onSubmit={(event) => void submit(event)}>{error && <Alert variant="destructive">{error}</Alert>}<Field label="Nome completo"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="E-mail convidado"><Input value="colaborador@empresa.com" disabled /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Criar senha"><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field><Field label="Confirmar senha"><Input type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} /></Field></div><Alert variant="info">Este convite concede acesso como usuário. As funções Gerente, Dev ou QA são definidas separadamente em cada projeto.</Alert><Button className="w-full" type="submit" disabled={loading}>{loading ? 'Ativando...' : 'Ativar conta'}</Button><BackToLogin /></form></AuthRegistrationCard>
}

function AuthRegistrationCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-xl shadow-md"><CardHeader className="items-center space-y-5 p-8 pb-4 text-center"><BrandMark /><div><CardTitle className="text-2xl">{title}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{subtitle}</p></div></CardHeader><CardContent className="p-8 pt-3">{children}</CardContent></Card></main>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function BackToLogin() { return <p className="text-center text-sm text-muted-foreground"><Link className="font-medium text-primary hover:underline" to="/login">Voltar ao login</Link></p> }
