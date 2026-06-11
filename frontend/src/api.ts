import axios from 'axios'
import { demoAdapter } from '@/demo/store'
import { apiBaseUrl, isDemoMode } from '@/lib/env'

const api = axios.create({
  baseURL: apiBaseUrl,
  ...(isDemoMode ? { adapter: demoAdapter } : {}),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && !isDemoMode) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
