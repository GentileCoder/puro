<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../i18n'

const auth = useAuthStore()
const router = useRouter()
const { t, currentLang, setLanguage } = useI18n()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    // Explicit navigation after the state-changing auth action — the router
    // guard only re-evaluates on a navigation attempt, not on the reactive
    // auth state changing while sitting on /login.
    router.push({ name: 'Reservations' })
  } catch {
    error.value = t('login.error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div id="loginOverlay">
    <div id="loginBox">
      <h2>PURO</h2>
      <div class="login-sub">Place U R Order</div>
      <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 14px">
        <button
          v-for="lang in ['es', 'en', 'de']"
          :key="lang"
          class="lang-btn"
          :style="{ opacity: currentLang === lang ? 1 : 0.4, fontWeight: currentLang === lang ? 700 : 400 }"
          @click="setLanguage(lang)"
        >{{ lang.toUpperCase() }}</button>
      </div>
      <input v-model="email" type="email" placeholder="Email" autocomplete="email" @keydown.enter="$refs.passInput.focus()">
      <input ref="passInput" v-model="password" type="password" :placeholder="t('login.password')" autocomplete="current-password" @keydown.enter="handleSubmit">
      <div id="loginError">{{ error }}</div>
      <button id="loginBtn" class="login-btn" :disabled="submitting" @click="handleSubmit">{{ t('login.submit') }}</button>
    </div>
  </div>
</template>

<style scoped>
#loginOverlay { position: fixed; inset: 0; background: var(--color-bg); z-index: 200; display: flex; align-items: center; justify-content: center; }
#loginBox { background: var(--color-surface); border-radius: 16px; padding: 36px 32px; width: 340px; border: 1px solid var(--color-border); text-align: center; }
#loginBox h2 { font-size: 28px; font-weight: 800; margin-bottom: 6px; color: var(--color-primary-hover); letter-spacing: 4px; }
.login-sub { font-size: 12px; color: var(--color-text-muted); margin-bottom: 28px; letter-spacing: 0.5px; }
#loginBox input { width: 100%; margin-bottom: 10px; text-align: left; }
.login-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); border: none; background: var(--color-primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px; transition: background var(--transition-fast); }
.login-btn:hover { background: var(--color-primary-hover); }
.login-btn:disabled { opacity: 0.4; cursor: not-allowed; }
#loginError { font-size: 12px; color: var(--color-danger-fg); min-height: 16px; margin-bottom: 6px; text-align: left; }
.lang-btn { background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; border-radius: 5px; padding: 3px 8px; font-size: 11px; cursor: pointer; }
</style>
