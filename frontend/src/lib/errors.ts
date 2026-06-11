import axios from 'axios'

type ErrorPayload = {
  detail?: string
  error?: string
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ErrorPayload>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.error ?? error.message ?? fallback
  }

  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const payload = error as ErrorPayload
    return payload.detail ?? payload.error ?? fallback
  }

  return fallback
}
