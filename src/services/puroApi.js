import { fetchWithAuth } from './httpClient'

export async function loadState(businessId) {
  const res = await fetchWithAuth(`?business=${encodeURIComponent(businessId)}`)
  if (!res.ok) throw new Error('Failed to load state')
  return res.json()
}

export async function saveState(businessId, payload) {
  const res = await fetchWithAuth(`?business=${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to save state')
  return res.json()
}
