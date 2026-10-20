import { fetchWithAuth } from './httpClient'

export async function listBusinesses() {
  const res = await fetchWithAuth('/businesses')
  if (!res.ok) throw new Error('Failed to load businesses')
  const data = await res.json()
  return data.businesses || []
}

export async function createBusiness(name) {
  const res = await fetchWithAuth('/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create business')
  return res.json()
}
