import { useState, useEffect } from 'react'
import api from './api'
import './App.css'

type View = 'login' | 'register' | 'profile'

interface UserProfile {
  id: number
  username: string
  email: string
}

function App() {
  const [view, setView] = useState<View>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
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
    try {
      const res = await api.post('http://localhost:8000/api/token/', { username, password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      await fetchProfile()
    } catch {
      setError('Usuário ou senha inválidos.')
    }
  }

  const handleRegister = async () => {
    setError('')
    try {
      await api.post('register/', { username, password, email })
      setView('login')
      setError('Conta criada! Faça login.')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setProfile(null)
    setView('login')
    setUsername('')
    setPassword('')
  }

  if (view === 'profile' && profile) {
    return (
      <section id="center">
        <h1>Bem-vindo, {profile.username}! 👋</h1>
        <p>Email: {profile.email || '(não informado)'}</p>
        <p>ID: {profile.id}</p>
        <button onClick={handleLogout}>Sair</button>
      </section>
    )
  }

  return (
    <section id="center">
      <h1>{view === 'login' ? 'Login' : 'Cadastro'}</h1>

      {error && <p style={{ color: 'salmon' }}>{error}</p>}

      <input
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />

      {view === 'register' && (
        <input
          placeholder="Email (opcional)"
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