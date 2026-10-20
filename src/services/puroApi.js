import { fetchWithAuth } from './httpClient'

export async function loadState() {
  const res = await fetchWithAuth('')
  if (!res.ok) throw new Error('Failed to load state')
  return res.json()
}

export async function saveState(payload) {
  const res = await fetchWithAuth('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to save state')
  return res.json()
}
