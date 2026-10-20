<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { usePuroStore } from '../../stores/puro'
import { useI18n } from '../../i18n'
import { fanIdFor } from '../../theme/applyTheme'
import ThemeSettingsModal from './ThemeSettingsModal.vue'

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

const fanId = computed(() => fanIdFor(puro.theme.id))
const isAdmin = computed(() => auth.role === 'admin')
const themeModalOpen = ref(false)

function handleLogout() {
  auth.logout()
}
</script>

<template>
  <header>
    <div style="display: flex; align-items: baseline; gap: 10px">
      <h1>PURO</h1>
      <span v-if="fanId === 'realmadrid'" class="fan-row">
        <span class="fan-star">★★★</span> Hala Madrid
      </span>
      <span v-if="fanId === 'cuba'" class="fan-star cuba-star">★</span>
      <span v-if="fanId === 'brazil'" class="fan-row">
        <span class="fan-star">★★★★★</span> Pentacampeão
      </span>
    </div>
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
      <button v-if="isAdmin" class="hbtn" title="Theme" @click="themeModalOpen = true">⚙ Theme</button>
      <button class="hbtn" @click="handleLogout">{{ t('header.logout') }}</button>
    </div>
  </header>
  <div
    v-if="fanId === 'realmadrid'"
    class="fan-stripe"
    style="background: linear-gradient(90deg, var(--color-primary) 50%, var(--color-gold) 50%)"
  ></div>
  <div
    v-if="fanId === 'cuba'"
    class="fan-stripe"
    style="background: linear-gradient(90deg, var(--color-flag-blue) 0 20%, #fff 20% 40%, var(--color-primary) 40% 60%, #fff 60% 80%, var(--color-flag-blue) 80% 100%)"
  ></div>
  <div
    v-if="fanId === 'brazil'"
    class="fan-stripe"
    style="background: linear-gradient(90deg, var(--color-success-fg) 33%, var(--color-primary) 33% 66%, var(--color-flag-blue) 66%)"
  ></div>

  <ThemeSettingsModal v-if="isAdmin" :open="themeModalOpen" @close="themeModalOpen = false" />
</template>

<style scoped>
.lang-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 11px;
  cursor: pointer;
}
.hbtn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.fan-row { font-size: 11px; color: var(--color-text-muted); display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.fan-star { color: var(--color-gold); font-size: 11px; letter-spacing: 1px; }
.cuba-star { font-size: 14px; }
.fan-stripe { height: 4px; width: 100%; }
</style>
