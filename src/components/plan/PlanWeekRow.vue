<script setup>
import { useI18n } from '../../i18n'
import { planKey } from '../../utils/plan'

const props = defineProps({
  // [{ date: Date, name: string, slotLabels: string[] }]
  days: { type: Array, required: true },
  dataSource: { type: Object, required: true },
  editable: { type: Boolean, required: true },
})
const emit = defineEmits(['edit'])

const { t, getLangLocale, slotLabel } = useI18n()

function cellValue(day, slot) {
  return props.dataSource[planKey(day.date, slot)] || ''
}

function setCellValue(day, slot, value) {
  props.dataSource[planKey(day.date, slot)] = value
  emit('edit')
}
</script>

<template>
  <div class="plan-grid">
    <div v-for="day in days" :key="day.date.toISOString()" class="plan-day">
      <div class="plan-day-header">
        {{ day.name }}
        <span style="font-weight: 400; color: #888; margin-left: 6px; font-size: 10px">{{ day.date.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short' }) }}</span>
      </div>
      <div v-for="slot in day.slotLabels" :key="slot" class="plan-slot">
        <div class="plan-slot-label">{{ slotLabel(slot) }}</div>
        <input
          v-if="editable"
          :value="cellValue(day, slot)"
          type="text"
          :placeholder="t('plan.name_ph')"
          @input="setCellValue(day, slot, $event.target.value)"
        >
        <div v-else style="font-size: 12px; font-weight: 500; padding: 6px 0" :style="cellValue(day, slot) ? 'color:var(--color-text)' : 'color:var(--color-text-faint)'">
          {{ cellValue(day, slot) || '—' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 10px; }
.plan-day { background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border); overflow: hidden; }
.plan-day-header { background: var(--color-surface-raised); padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--color-primary-hover); border-bottom: 1px solid var(--color-border); }
.plan-slot { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.plan-slot:last-child { border-bottom: none; }
.plan-slot-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 5px; }
.plan-slot input { width: 100%; padding: 6px 8px; font-size: 12px; }
</style>
