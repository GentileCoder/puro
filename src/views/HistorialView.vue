<script setup>
import { computed } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useI18n } from '../i18n'

const puro = usePuroStore()
const { t } = useI18n()

const sorted = computed(() => [...puro.history24].sort((a, b) => b.closedAt - a.closedAt))

function timeLabel(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="content active">
    <p style="font-size: 12px; color: #666; margin-bottom: 14px">{{ t('history.description') }}</p>
    <p v-if="!sorted.length" style="color: #666; font-size: 13px; text-align: center; padding: 30px">{{ t('history.empty') }}</p>
    <div v-for="(h, i) in sorted" :key="i" class="hist-row">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
        <h4>{{ t('tables.table') }} {{ h.tableLabel }}</h4>
        <span style="font-size: 16px; font-weight: 700; color: var(--color-success-fg)">€{{ h.total.toFixed(2) }}</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
        <span v-if="h.method === 'EC'" style="background: #1d3a6a; color: #7ab4f5; padding: 2px 8px; border-radius: 10px; font-size: 11px">{{ t('history.card') }}</span>
        <span v-else style="background: #1d4a2e; color: #7ed4a7; padding: 2px 8px; border-radius: 10px; font-size: 11px">{{ t('history.cash') }}</span>
        <span style="font-size: 11px; color: #666">{{ timeLabel(h.closedAt) }}</span>
      </div>
      <p style="font-size: 11px; color: #666">{{ h.items.map((i) => `${i.qty}× ${i.name}`).join(', ') }}</p>
    </div>
  </div>
</template>
