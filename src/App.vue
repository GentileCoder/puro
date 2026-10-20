<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { usePuroStore } from './stores/puro'
import { applyTheme } from './theme/applyTheme'
import AppHeader from './components/layout/AppHeader.vue'
import AppNav from './components/layout/AppNav.vue'
import ThemeAccent from './components/layout/ThemeAccent.vue'

const route = useRoute()
const auth = useAuthStore()
const puro = usePuroStore()
const showChrome = computed(() => !route.meta.public && !!auth.user)

// Loaded once per sign-in (covers both "already logged in on boot" and
// "just logged in this session") — matches legacy's single loadFromCloud()
// call in init(), just triggered reactively instead of imperatively.
watch(
  () => auth.user,
  (user) => {
    if (user) puro.load()
  },
  { immediate: true },
)

// Theme is shared app-wide via the cloud blob (admin-only to change, see
// ThemeSettingsModal.vue) — re-applied whenever it changes, including the
// moment load() pulls in whatever theme an admin already picked.
watch(
  () => puro.theme,
  (theme) => applyTheme(theme.id, theme.mode),
  { immediate: true, deep: true },
)
</script>

<template>
  <ThemeAccent />
  <AppHeader v-if="showChrome" />
  <AppNav v-if="showChrome" />
  <RouterView />
</template>
