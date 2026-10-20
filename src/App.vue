<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { usePuroStore } from './stores/puro'
import AppHeader from './components/layout/AppHeader.vue'
import AppNav from './components/layout/AppNav.vue'

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
</script>

<template>
  <AppHeader v-if="showChrome" />
  <AppNav v-if="showChrome" />
  <RouterView />
</template>
