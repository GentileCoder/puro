import { fetchWithAuth } from './httpClient'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function throwForError(res, fallbackMessage) {
  let message = fallbackMessage
  try {
    const body = await res.json()
    if (body?.error) message = body.error
  } catch {
    // Response wasn't JSON (e.g. a raw 500 with no body) — keep the fallback.
  }
  throw new Error(message)
}

export async function listUsers() {
  const res = await fetchWithAuth('/users')
  if (!res.ok) await throwForError(res, 'Failed to load users')
  return res.json()
}

export async function createUser(email, password, role, businessId) {
  const res = await fetchWithAuth('/users', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password, role, businessId }),
  })
  if (!res.ok) await throwForError(res, 'Failed to create user')
  return res.json()
}

// Sends both fields every time — the backend's PUT replaces the whole
// {role, businessId} claim pair, so a role-only or business-only change
// still needs the caller to pass the other field's current value along.
export async function updateUser(uid, role, businessId) {
  const res = await fetchWithAuth('/users', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ uid, role, businessId }),
  })
  if (!res.ok) await throwForError(res, 'Failed to update user')
  return res.json()
}

export async function deleteUser(uid) {
  const res = await fetchWithAuth('/users', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ uid }),
  })
  if (!res.ok) await throwForError(res, 'Failed to delete user')
  return res.json()
}
