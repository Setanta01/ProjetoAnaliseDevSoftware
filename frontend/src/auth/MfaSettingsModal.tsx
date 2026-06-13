import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Mail, Shield, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMFA, type MfaStatus, type MfaTipo, type SetupTotpResult } from '@/hooks/useMFA'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (active: boolean, type: MfaTipo | null) => void
}

type Step = 'menu' | 'choose-type' | 'setup-totp' | 'setup-email' | 'disable' | 'done'

export default function MfaSettingsModal({ open, onOpenChange, onStatusChange }: Props) {
  const { loading, error, getStatus, setupTotp, verifyTotp, setupEmail, verifyEmail, disable } = useMFA()
  const [step, setStep] = useState<Step>('menu')
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null)
  const [setupType, setSetupType] = useState<MfaTipo | null>(null)
  const [totpData, setTotpData] = useState<SetupTotpResult | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    if (!open) return
    void getStatus().then((status) => { if (status) setMfaStatus(status) })
  }, [getStatus, open])

  const handleSetupTotp = async () => {
    const data = await setupTotp()
    if (!data) return
    setTotpData(data)
    setSetupType('TOTP')
    setStep('setup-totp')
  }

  const handleSetupEmail = async () => {
    const result = await setupEmail()
    if (!result) return
    setSetupType('EMAIL')
    setStep('setup-email')
  }

  const handleVerify = async () => {
    const result = setupType === 'TOTP' ? await verifyTotp(code) : setupType === 'EMAIL' ? await verifyEmail(code) : null
    if (!result || !setupType) return
    setMfaStatus({ mfa_ativo: true, mfa_tipo: setupType })
    onStatusChange(true, setupType)
    setMessage(result.message)
    setStep('done')
  }

  const handleDisable = async () => {
    const result = await disable(password)
    if (!result) return
    setMfaStatus({ mfa_ativo: false, mfa_tipo: null })
    onStatusChange(false, null)
    setMessage(result.message)
    setStep('done')
  }

  const resetAndClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setStep('menu')
      setCode('')
      setPassword('')
      setMessage('')
      setShowSecret(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-[420px] p-0">
        <DialogHeader className="border-b border-border bg-muted px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-primary" /> Autenticação em dois fatores</DialogTitle>
          <DialogDescription className="sr-only">Configure a autenticação em dois fatores da conta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 p-6">
          {step === 'menu' && (
            mfaStatus === null ? <p className="text-sm text-muted-foreground">Carregando status...</p> : mfaStatus.mfa_ativo ? (
              <>
                <Badge variant="success" className="w-full justify-center rounded-lg py-2"><ShieldCheck className="h-4 w-4" /> MFA ativo via {mfaStatus.mfa_tipo === 'TOTP' ? 'Authenticator App' : 'E-mail'}</Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">Sua conta está protegida com verificação em dois fatores.</p>
                <Button variant="dangerSoft" className="w-full" onClick={() => setStep('disable')}><ShieldOff className="h-4 w-4" /> Desativar MFA</Button>
              </>
            ) : (
              <>
                <Badge variant="neutral" className="w-full justify-center rounded-lg py-2"><Shield className="h-4 w-4" /> MFA desativado</Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">Adicione uma camada extra de segurança à sua conta escolhendo um método abaixo.</p>
                <Button className="w-full" onClick={() => setStep('choose-type')}>Ativar MFA</Button>
              </>
            )
          )}

          {step === 'choose-type' && (
            <>
              <p className="text-sm text-muted-foreground">Escolha como você quer receber os códigos:</p>
              <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent" onClick={() => void handleSetupTotp()} disabled={loading}>
                <Smartphone className="h-5 w-5 text-primary" /><span><strong className="block text-sm">Authenticator App</strong><span className="text-xs text-muted-foreground">Google Authenticator, Authy, 1Password...</span></span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent" onClick={() => void handleSetupEmail()} disabled={loading}>
                <Mail className="h-5 w-5 text-primary" /><span><strong className="block text-sm">Código por e-mail</strong><span className="text-xs text-muted-foreground">Receba um código de 6 dígitos no seu e-mail.</span></span>
              </button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep('menu')}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            </>
          )}

          {step === 'setup-totp' && totpData && (
            <>
              <p className="text-sm text-muted-foreground">Escaneie o QR code com o app Authenticator:</p>
              <img src={`data:image/png;base64,${totpData.qrcode}`} alt="QR Code TOTP" className="mx-auto h-44 w-44 rounded-xl border border-border" />
              <Button variant="ghost" className="w-full" onClick={() => setShowSecret((current) => !current)}>{showSecret ? 'Ocultar chave manual' : 'Digitar manualmente'}</Button>
              {showSecret && <div className="break-all rounded-md border border-border bg-muted p-3 text-center font-mono text-xs tracking-widest">{totpData.secret}</div>}
              <p className="text-sm text-muted-foreground">Depois de escanear, insira o código gerado pelo app:</p>
              <CodeInput value={code} onChange={setCode} onSubmit={handleVerify} />
              {error && <Alert variant="destructive">{error}</Alert>}
              <Button className="w-full" onClick={() => void handleVerify()} disabled={loading || code.length < 6}>{loading ? 'Verificando...' : 'Confirmar e ativar'}</Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep('choose-type')}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            </>
          )}

          {step === 'setup-email' && (
            <>
              <Alert variant="info" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Código enviado para seu e-mail</Alert>
              <p className="text-sm text-muted-foreground">Insira o código de 6 dígitos recebido:</p>
              <CodeInput value={code} onChange={setCode} onSubmit={handleVerify} autoFocus />
              {error && <Alert variant="destructive">{error}</Alert>}
              <Button className="w-full" onClick={() => void handleVerify()} disabled={loading || code.length < 6}>{loading ? 'Verificando...' : 'Confirmar e ativar'}</Button>
              <Button variant="link" className="w-full" onClick={() => { void setupEmail(); setCode('') }}>Reenviar código</Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep('choose-type')}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            </>
          )}

          {step === 'disable' && (
            <>
              <p className="text-sm text-muted-foreground">Para desativar o MFA, confirme sua senha:</p>
              <Input type="password" placeholder="Sua senha atual" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleDisable() }} autoFocus />
              {error && <Alert variant="destructive">{error}</Alert>}
              <Button variant="dangerSoft" className="w-full" onClick={() => void handleDisable()} disabled={loading || !password}>{loading ? 'Desativando...' : 'Confirmar desativação'}</Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep('menu')}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="py-4 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-success" /><p className="mt-3 text-sm text-muted-foreground">{message}</p></div>
              <Button className="w-full" onClick={() => resetAndClose(false)}>Fechar</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => Promise<void>
  autoFocus?: boolean
}

function CodeInput({ value, onChange, onSubmit, autoFocus }: CodeInputProps) {
  return <Input className="h-14 text-center font-mono text-2xl font-bold tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="000000" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter') void onSubmit() }} autoFocus={autoFocus} />
}
