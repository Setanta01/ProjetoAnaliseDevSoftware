import { useState, useEffect } from 'react'
import api from './api'
import './App.css'
import DashboardRouter from './dashboards/DashboardRouter'

type View = 'login' | 'register' | 'profile'

interface UserProfile {
  id: number
  username: string
  email: string
  cargo: string
}

function App() {
  const [view, setView] = useState<View>('login')
  const [username, setUsername] = useState('') // Usado para Email no Login e Nome no Registro
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')      // Usado para Email no Registro
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('profile/')
      setProfile(res.data)
      setView('profile')
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  const handleLogin = async () => {
    setError('')
    
    // Log para ver o que estamos enviando para o login
    console.log("Tentando login com:", { email: username, password })

    try {
      const res = await api.post('http://localhost:8000/api/token/', { 
        email: username, 
        password 
      })
      
      // Sucesso
      console.log("Login bem sucedido:", res.data)
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      await fetchProfile()
      
    } catch (err: any) {
      console.error("Erro completo no login:", err)

      let mensagemErro = 'Usuário ou senha inválidos.'

      if (err.response) {
        console.log("Dados da resposta do erro (Login):", err.response.data)
        
        if (err.response.data.detail) {
          mensagemErro = err.response.data.detail
        } else if (err.response.data.error) {
          mensagemErro = err.response.data.error
        } else if (typeof err.response.data === 'string') {
          mensagemErro = err.response.data
        } else {
          mensagemErro = JSON.stringify(err.response.data)
        }
      } else if (err.request) {
        mensagemErro = 'Sem resposta do servidor. Verifique a conexão.'
      } else {
        mensagemErro = err.message
      }

      setError(mensagemErro)
    }
  }

  const handleRegister = async () => {
    setError('')
    
    // Log para ver o que estamos enviando
    console.log("Tentando registrar com:", { nome: username, email, password, cargo: 'DEV' })

    try {
      const res = await api.post('register/', { 
        nome: username,     
        email: email,       
        password: password,
        cargo: 'DEV'        
      })
      
      // Sucesso
      console.log("Registro bem sucedido:", res.data)
      setView('login')
      setError('Conta criada! Faça login.')
      
    } catch (err: any) {
      console.error("Erro completo no registro:", err)

      // Tenta pegar a mensagem específica do backend (campo 'error' ou detalhes do validation error)
      let mensagemErro = 'Erro ao registrar.'

      if (err.response) {
        // Se o servidor respondeu, mas com erro (400, 500, etc)
        console.log("Dados da resposta do erro:", err.response.data)
        
        if (err.response.data.error) {
          mensagemErro = err.response.data.error
        } else if (err.response.data.detail) {
          mensagemErro = err.response.data.detail
        } else if (typeof err.response.data === 'string') {
          mensagemErro = err.response.data
        } else {
          // Se for um dicionário com vários erros (ex: email: ['Este campo é obrigatório'])
          mensagemErro = JSON.stringify(err.response.data)
        }
      } else if (err.request) {
        // Se a requisição foi feita mas não houve resposta (servidor caiu, network error)
        mensagemErro = 'Sem resposta do servidor. Verifique a conexão.'
      } else {
        // Erro ao montar a requisição
        mensagemErro = err.message
      }

      setError(mensagemErro)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setProfile(null)
    setView('login')
    setUsername('')
    setPassword('')
    setEmail('')
  }

  if (view === 'profile' && profile) {
  return (
    <>
      <DashboardRouter cargo={profile.cargo} />

      <section id="center">
        <button onClick={handleLogout}>Sair</button>
      </section>
    </>
  )
}

  return (
    <section id="center">
      <h1>{view === 'login' ? 'Login' : 'Cadastro'}</h1>

      {error && <p style={{ color: 'salmon' }}>{error}</p>}

      {/* No Login: Este campo serve como Email. No Registro: serve como Nome. */}
      <input
        placeholder={view === 'login' ? "Email" : "Nome Completo"}
        value={username}
        onChange={e => setUsername(e.target.value)}
      />

      {/* No Registro: pedimos o email separadamente */}
      {view === 'register' && (
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      )}

      <input
        placeholder="Senha"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      {view === 'login' ? (
        <>
          <button onClick={handleLogin}>Entrar</button>
          <p>
            Não tem conta?{' '}
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setView('register'); setError('') }}>
              Cadastre-se
            </span>
          </p>
        </>
      ) : (
        <>
          <button onClick={handleRegister}>Criar conta</button>
          <p>
            Já tem conta?{' '}
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setView('login'); setError('') }}>
              Fazer login
            </span>
          </p>
        </>
      )}
    </section>
  )
}

export default App