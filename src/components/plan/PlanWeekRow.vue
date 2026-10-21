<script setup>
import { useI18n } from '../../i18n'
import { planKey } from '../../utils/plan'

const props = defineProps({
  // [{ date: Date, name: string, slotLabels: string[] }]
  days: { type: Array, required: true },
  dataSource: { type: Object, required: true },
  editable: { type: Boolean, required: true },
  // Staff mode only, below. requestsSource: puro.planRequests, passed
  // whenever the business is in Staff mode (both to the manager's editable
  // grid, to show pending requests under each input, and to the staff
  // member's own interactive grid).
  requestsSource: { type: Object, default: null },
  // True only for a staff-role viewer looking at their own unlocked draft in
  // Staff mode — swaps the text input for Request/Pending buttons.
  interactive: { type: Boolean, default: false },
  currentUid: { type: String, default: null },
})
const emit = defineEmits(['edit', 'request', 'cancel-request', 'accept-request', 'decline-request'])

const { t, getLangLocale, slotLabel } = useI18n()

function cellValue(day, slot) {
  return props.dataSource[planKey(day.date, slot)] || ''
}

function setCellValue(day, slot, value) {
  props.dataSource[planKey(day.date, slot)] = value
  emit('edit')
}

function cellRequests(day, slot) {
  if (!props.requestsSource) return []
  return props.requestsSource[planKey(day.date, slot)] || []
}

function myRequest(day, slot) {
  return cellRequests(day, slot).find((r) => r.uid === props.currentUid) || null
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

        <template v-if="editable">
          <input
            :value="cellValue(day, slot)"
            type="text"
            :placeholder="t('plan.name_ph')"
            @input="setCellValue(day, slot, $event.target.value)"
          >
          <div v-if="cellRequests(day, slot).length" class="plan-requests">
            <div v-for="req in cellRequests(day, slot)" :key="req.uid" class="plan-request-row">
              <span class="plan-request-email">{{ req.email }}</span>
              <button class="plan-req-btn accept" :title="t('plan.accept')" @click="emit('accept-request', day, slot, req)">✓</button>
              <button class="plan-req-btn decline" :title="t('plan.decline')" @click="emit('decline-request', day, slot, req)">✕</button>
            </div>
          </div>
        </template>

        <template v-else-if="interactive">
          <div v-if="cellValue(day, slot)" style="font-size: 12px; font-weight: 500; padding: 6px 0; color: var(--color-text)">
            {{ cellValue(day, slot) }}
          </div>
          <button v-else-if="myRequest(day, slot)" class="plan-req-pending-btn" @click="emit('cancel-request', day, slot, myRequest(day, slot))">
            {{ t('plan.pending_cancel') }}
          </button>
          <button v-else class="plan-req-request-btn" @click="emit('request', day, slot)">
            {{ t('plan.request') }}
          </button>
        </template>

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
.plan-requests { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.plan-request-row { display: flex; align-items: center; gap: 4px; font-size: 11px; background: var(--color-surface-raised); border-radius: 5px; padding: 3px 6px; }
.plan-request-email { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-muted); }
.plan-req-btn { border: none; border-radius: 4px; width: 18px; height: 18px; font-size: 11px; line-height: 1; cursor: pointer; flex-shrink: 0; }
.plan-req-btn.accept { background: var(--color-success-fg); color: #fff; }
.plan-req-btn.decline { background: var(--color-danger-fg); color: #fff; }
.plan-req-request-btn, .plan-req-pending-btn { width: 100%; padding: 6px 8px; font-size: 11px; border-radius: 6px; cursor: pointer; }
.plan-req-request-btn { background: var(--color-primary); border: 1px solid var(--color-primary); color: var(--color-primary-text); }
.plan-req-pending-btn { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); }
</style>
