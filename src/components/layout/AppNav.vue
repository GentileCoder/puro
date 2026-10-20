<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useI18n } from '../../i18n'

const auth = useAuthStore()
const { t } = useI18n()

const ALL_TABS = [
  { name: 'Reservations', label: 'tab.reservations', roles: ['admin', 'staff', 'manager'] },
  { name: 'Mesas', label: 'tab.tables', roles: ['admin', 'staff', 'manager'] },
  { name: 'Articulos', label: 'tab.articles', roles: ['admin', 'manager'] },
  { name: 'Historial', label: 'tab.history', roles: ['admin', 'manager'] },
  { name: 'Plan', label: 'tab.plan', roles: ['admin', 'staff', 'manager'] },
  { name: 'Usuarios', label: 'tab.users', roles: ['admin'] },
]

const tabs = computed(() => ALL_TABS.filter((tab) => tab.roles.includes(auth.role)))
</script>

<template>
  <nav class="tabs">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="tab"
      active-class="active"
    >{{ t(tab.label) }}</RouterLink>
  </nav>
</template>
