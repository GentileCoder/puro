<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { usePuroStore } from './stores/puro'
import { useBusinessStore } from './stores/business'
import { applyTheme } from './theme/applyTheme'
import AppHeader from './components/layout/AppHeader.vue'
import AppNav from './components/layout/AppNav.vue'
import ThemeAccent from './components/layout/ThemeAccent.vue'
import BlockedNoBusiness from './components/layout/BlockedNoBusiness.vue'
import { useI18n } from './i18n'

const route = useRoute()
const auth = useAuthStore()
const puro = usePuroStore()
const business = useBusinessStore()
const { t } = useI18n()
const showChrome = computed(() => !route.meta.public && !!auth.user && !business.blocked)
// Admin, logged in, but hasn't created a business yet — the header's "+" is
// their way out of this, so unlike BlockedNoBusiness this keeps AppHeader
// visible instead of replacing the whole screen.
const needsFirstBusiness = computed(() =>
  showChrome.value && auth.role === 'admin' && !business.activeBusinessId && business.businesses.length === 0,
)

// Resolves which business is active (admin: their last-used/first business;
// non-admin: their assigned businessId, or business.blocked) every time
// auth.user changes — covers both "already logged in on boot" and "just
// logged in this session".
watch(
  () => auth.user,
  (user) => {
    if (user) business.resolveActiveBusiness()
  },
  { immediate: true },
)

// Loads (or re-loads, on an admin business switch) puro's entire domain
// state for whichever business is now active. One watcher covers both the
// initial load and every subsequent switch — resolveActiveBusiness() above
// always ends by setting activeBusinessId, triggering this.
watch(
  () => business.activeBusinessId,
  (id) => {
    if (id) puro.load(id)
  },
)

// Theme is shared per-business via its own blob (admin-only to change, see
// ThemeSettingsModal.vue) — re-applied whenever it changes, including the
// moment load() pulls in whatever theme that business's admin picked.
watch(
  () => puro.theme,
  (theme) => applyTheme(theme.id, theme.mode),
  { immediate: true, deep: true },
)
</script>

<template>
  <ThemeAccent />
  <template v-if="business.blocked && auth.user">
    <BlockedNoBusiness />
  </template>
  <template v-else>
    <AppHeader v-if="showChrome" />
    <template v-if="needsFirstBusiness">
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 80px 20px">
        <h2 style="font-size: 16px">{{ t('business.onboarding_title') }}</h2>
        <p style="font-size: 13px; color: var(--color-text-muted); max-width: 360px">{{ t('business.onboarding_body') }}</p>
      </div>
    </template>
    <template v-else>
      <AppNav v-if="showChrome" />
      <RouterView />
    </template>
  </template>
</template>
