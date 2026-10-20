import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase'

const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const role = ref(null)
  const idToken = ref(null)
  const ready = ref(false)
  let refreshTimer = null

  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const result = await fbUser.getIdTokenResult(true)
          user.value = fbUser
          role.value = result.claims.role || null
          idToken.value = result.token
          clearInterval(refreshTimer)
          refreshTimer = setInterval(async () => {
            idToken.value = await fbUser.getIdToken(true)
          }, TOKEN_REFRESH_INTERVAL)
        } else {
          user.value = null
          role.value = null
          idToken.value = null
          clearInterval(refreshTimer)
        }
        if (!ready.value) {
          ready.value = true
          resolve()
        }
      })
    })
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
    return true
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, role, idToken, ready, init, login, logout }
})
