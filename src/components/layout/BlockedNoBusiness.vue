<script setup>
import { useAuthStore } from '../../stores/auth'
import { useI18n } from '../../i18n'
import AppLogo from './AppLogo.vue'

const auth = useAuthStore()
const { t } = useI18n()

function handleLogout() {
  auth.logout()
}
</script>

<template>
  <div id="loginOverlay">
    <div id="loginBox">
      <AppLogo :size="48" style="margin-bottom: 8px" />
      <h2 style="font-size: 20px; letter-spacing: 2px">{{ t('business.unassigned_title') }}</h2>
      <p style="font-size: 13px; color: var(--color-text-muted); margin: 10px 0 24px; text-align: left">{{ t('business.unassigned_body') }}</p>
      <button class="login-btn" @click="handleLogout">{{ t('header.logout') }}</button>
    </div>
  </div>
</template>

<style scoped>
#loginOverlay { position: fixed; inset: 0; background: var(--color-bg); z-index: 200; display: flex; align-items: center; justify-content: center; }
#loginBox { background: var(--color-surface); border-radius: var(--radius-xl); padding: 36px 32px; width: 340px; border: 1px solid var(--color-border); text-align: center; box-shadow: var(--card-shadow); }
.login-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); border: none; background: var(--color-primary); color: var(--color-primary-text); font-size: 14px; font-weight: 600; cursor: pointer; transition: background var(--transition-fast); }
.login-btn:hover { background: var(--color-primary-hover); }
</style>
