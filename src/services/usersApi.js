import { fetchWithAuth } from './httpClient'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function listUsers() {
  const res = await fetchWithAuth('/users')
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function createUser(email, password, role) {
  const res = await fetchWithAuth('/users', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password, role }),
  })
  if (!res.ok) throw new Error('Failed to create user')
  return res.json()
}

export async function updateUserRole(uid, role) {
  const res = await fetchWithAuth('/users', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ uid, role }),
  })
  if (!res.ok) throw new Error('Failed to update role')
  return res.json()
}

export async function deleteUser(uid) {
  const res = await fetchWithAuth('/users', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ uid }),
  })
  if (!res.ok) throw new Error('Failed to delete user')
  return res.json()
}
