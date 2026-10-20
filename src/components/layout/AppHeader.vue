<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { usePuroStore } from '../../stores/puro'
import { useI18n } from '../../i18n'

const auth = useAuthStore()
const puro = usePuroStore()
const { t, currentLang, setLanguage, getLangLocale } = useI18n()

const headerDate = computed(() =>
  new Date().toLocaleDateString(getLangLocale(), { weekday: 'long', day: 'numeric', month: 'long' }),
)

const STATUS_COLOR = {
  idle: '#8b949e',
  loading: '#f59e0b',
  saving: '#f59e0b',
  saved: '#22c55e',
  synced: '#22c55e',
  offline: '#ef4444',
}

function handleLogout() {
  auth.logout()
}
</script>

<template>
  <header>
    <h1>PURO</h1>
    <span>{{ headerDate }}</span>
    <div style="display: flex; align-items: center; gap: 10px">
      <span style="font-size: 12px; opacity: 0.8">
        <span class="sync-dot" :style="{ background: STATUS_COLOR[puro.syncStatus] }"></span>{{ t('sync.' + puro.syncStatus) }}
      </span>
      <div style="display: flex; gap: 3px">
        <button
          v-for="lang in ['es', 'en', 'de']"
          :key="lang"
          class="lang-btn"
          :style="{ opacity: currentLang === lang ? 1 : 0.4, fontWeight: currentLang === lang ? 700 : 400 }"
          @click="setLanguage(lang)"
        >{{ lang.toUpperCase() }}</button>
      </div>
      <button class="hbtn" @click="handleLogout">{{ t('header.logout') }}</button>
    </div>
  </header>
</template>

<style scoped>
.lang-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 11px;
  cursor: pointer;
}
.hbtn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
</style>
