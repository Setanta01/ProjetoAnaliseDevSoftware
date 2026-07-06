import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '@/lib/env'

const api = axios.create({
  baseURL: apiBaseUrl,
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponse {
  access: string
  refresh?: string
}

let refreshRequest: Promise<string> | null = null

function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) throw new Error('Refresh token ausente.')

  const response = await axios.post<RefreshResponse>(`${apiBaseUrl}token/refresh/`, { refresh })
  localStorage.setItem('access_token', response.data.access)
  if (response.data.refresh) localStorage.setItem('refresh_token', response.data.refresh)
  return response.data.access
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401 || !error.config) throw error

    const config = error.config as RetryableRequestConfig
    const requestPath = config.url ?? ''
    const isPublicAuthRequest = [
      '/auth/login/',
      '/auth/google/',
      '/auth/convite-info/',
      '/auth/ativar-convite/',
      '/mfa/challenge/',
      '/mfa/resend-email/',
    ].some((path) => requestPath.includes(path))
    if (config._retry || isPublicAuthRequest || requestPath.includes('/token/refresh/')) throw error

    config._retry = true
    try {
      refreshRequest ??= refreshAccessToken().finally(() => { refreshRequest = null })
      const access = await refreshRequest
      config.headers.Authorization = `Bearer ${access}`
      return api(config)
    } catch (refreshError) {
      clearSession()
      throw refreshError
    }
  },
)

export default api
