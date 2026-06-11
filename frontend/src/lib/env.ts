export const isDemoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true'
export const requiresInitialAdmin = import.meta.env.VITE_FIRST_BOOT === 'true'

export const apiBaseUrl = `${(import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')}/api/`
