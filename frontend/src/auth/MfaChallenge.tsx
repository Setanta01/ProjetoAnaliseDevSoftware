import { useState } from 'react'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMFA, type MfaTipo } from '@/hooks/useMFA'

interface Props {
  mfaTipo: MfaTipo
  mfaToken: string
  onSuccess: (tokens: { access: string; refresh: string }) => void
  onCancel: () => void
}

export default function MfaChallenge({ mfaTipo, mfaToken, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('')
  const [resendSucceeded, setResendSucceeded] = useState(false)
  const { loading, error, challenge, resendEmail } = useMFA()
  const Icon = mfaTipo === 'TOTP' ? ShieldCheck : Mail

  const handleSubmit = async () => {
    if (code.length < 6) return
    const result = await challenge(mfaToken, code)
    if (result) onSuccess(result)
  }

  const handleResend = async () => {
    const result = await resendEmail(mfaToken)
    if (result) setResendSucceeded(true)
  }

  return (
    <main className="auth-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[380px] rounded-[1.25rem] shadow-lg">
        <CardHeader className="items-center p-8 pb-4 text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
            <Icon className="h-7 w-7" />
          </span>
          <CardTitle className="text-lg">Verificação em duas etapas</CardTitle>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {mfaTipo === 'TOTP'
              ? 'Abra o Google Authenticator (ou Authy) e insira o código de 6 dígitos.'
              : 'Insira o código enviado para seu e-mail.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 p-8 pt-2">
          <Input
            className="h-14 text-center font-mono text-2xl font-bold tracking-[0.5em]"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => { if (event.key === 'Enter') void handleSubmit() }}
            autoFocus
          />
          {error && <Alert variant="destructive">{error}</Alert>}
          {resendSucceeded && <Alert variant="success">Novo código enviado!</Alert>}
          <Button className="w-full" onClick={() => void handleSubmit()} disabled={loading || code.length < 6}>
            {loading ? 'Verificando...' : 'Confirmar'}
          </Button>
          {mfaTipo === 'EMAIL' && (
            <Button variant="link" className="w-full" onClick={() => void handleResend()} disabled={loading}>
              Reenviar código
            </Button>
          )}
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
