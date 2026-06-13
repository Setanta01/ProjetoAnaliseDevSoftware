import { useState } from 'react'
import { Mail, RefreshCw, Send, CheckCircle2 } from 'lucide-react'
import api from '@/api'
import { PageContainer } from '@/components/app/PageContainer'
import { PageHeader } from '@/components/app/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'

interface InvitationSuccess {
  id: number
  email: string
  admin: boolean
}

export default function AdminInvitationsView() {
  const [email, setEmail] = useState('')
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<InvitationSuccess | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return setError('E-mail é obrigatório.')
    
    setLoading(true)
    setError('')
    try {
      const response = await api.post<{ detail: string; id: number }>('/admin/convites/', {
        email: email.trim(),
        admin
      })
      setSuccess({ id: response.data.id, email: email.trim(), admin })
      setEmail('')
      setAdmin(false)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao enviar convite.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!success) return
    setResendLoading(true)
    setError('')
    try {
      await api.post(`/admin/convites/${success.id}/reenviar/`)
      // Optional: Show a temporary success toast/alert here if there's a global notification system
      // Since there's no global toast, we'll just clear the error state and assume success
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Erro ao reenviar convite.'))
    } finally {
      setResendLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(null)
    setError('')
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader
        title="Enviar Convites"
        subtitle="Convide novos usuários para o sistema. Você pode conceder acesso de administrador global."
      />
      <div className="mx-auto mt-6 w-full max-w-xl">
        {success ? (
          <Card className="shadow-sm">
            <CardHeader className="items-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-muted text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <CardTitle>Convite enviado com sucesso!</CardTitle>
              <CardDescription>
                Um e-mail foi enviado para <strong className="text-foreground">{success.email}</strong> contendo o link de ativação.
                {success.admin && <span className="block mt-1 text-primary">Este usuário terá acesso de Administrador Global.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 flex flex-col items-center">
              {error && <Alert variant="destructive" className="w-full">{error}</Alert>}
              <div className="flex w-full gap-3">
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  Convidar outro
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => void handleResend()} disabled={resendLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Reenviando...' : 'Tentar reenviar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Novo Convite
              </CardTitle>
              <CardDescription>
                Informe o e-mail do destinatário para enviar um link de ativação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                {error && <Alert variant="destructive">{error}</Alert>}
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail do destinatário</Label>
                  <Input 
                    id="invite-email" 
                    type="email" 
                    placeholder="exemplo@email.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border p-4 bg-muted/30">
                  <Checkbox 
                    id="invite-admin" 
                    checked={admin} 
                    onCheckedChange={(checked) => setAdmin(checked === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="invite-admin" className="flex flex-col cursor-pointer">
                    <span className="font-semibold">Acesso de Administrador Global</span>
                    <span className="text-xs text-muted-foreground font-normal">Pode gerenciar projetos e enviar outros convites.</span>
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Convite
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
