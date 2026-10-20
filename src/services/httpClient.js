import { useAuthStore } from '../stores/auth'

const WORKER_URL = import.meta.env.VITE_WORKER_URL

export async function fetchWithAuth(path = '', options = {}) {
  const auth = useAuthStore()
  const headers = { ...(options.headers || {}) }
  if (auth.idToken) headers.Authorization = `Bearer ${auth.idToken}`
  const res = await fetch(WORKER_URL + path, { ...options, headers })
  return res
}
