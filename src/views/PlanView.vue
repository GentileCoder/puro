<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../i18n'
import { getMondayOfWeek, planKey, DAY_OFFSETS, SLOTS } from '../utils/plan'

const puro = usePuroStore()
const auth = useAuthStore()
const { t, getLangLocale, getDayNames, slotLabel } = useI18n()

const canEdit = computed(() => auth.role === 'admin' || auth.role === 'manager')
const weekOffset = ref(0)
const draft = reactive({})
const saved = ref(false)

const monday = computed(() => getMondayOfWeek(weekOffset.value))
const saturday = computed(() => { const d = new Date(monday.value); d.setDate(d.getDate() + 5); return d })
const weekLabel = computed(() =>
  `${monday.value.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short' })} – ${saturday.value.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}`,
)

const days = computed(() =>
  DAY_OFFSETS.map((offset, i) => {
    const date = new Date(monday.value)
    date.setDate(date.getDate() + offset)
    return { date, name: getDayNames()[i], slots: SLOTS[i + 1] }
  }),
)

function loadDraft() {
  Object.keys(draft).forEach((k) => delete draft[k])
  days.value.forEach((day) => {
    day.slots.forEach((slot) => {
      const key = planKey(day.date, slot)
      draft[key] = puro.planData[key] || ''
    })
  })
}
watch(weekOffset, loadDraft, { immediate: true })

function shiftWeek(dir) {
  weekOffset.value += dir
}

// Matches legacy savePlan() exactly: it replaces the ENTIRE planData with
// only the currently-visible week's entries (a pre-existing app quirk, not
// introduced by this migration — see migration notes).
function handleSave() {
  const entries = {}
  Object.entries(draft).forEach(([k, v]) => { if (v && v.trim()) entries[k] = v.trim() })
  puro.savePlan(entries)
  saved.value = true
  setTimeout(() => { saved.value = false }, 1500)
}

const summaryDays = computed(() =>
  days.value.map((day) => ({
    ...day,
    slotValues: day.slots.map((slot) => puro.planData[planKey(day.date, slot)] || '—'),
  })),
)
const hasSummaryData = computed(() => Object.keys(puro.planData).length > 0)
</script>

<template>
  <div class="content active">
    <div v-if="canEdit" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px">
      <div style="display: flex; align-items: center; gap: 10px">
        <button class="week-nav-btn" @click="shiftWeek(-1)">←</button>
        <span style="font-size: 13px; color: #aaa">{{ weekLabel }}</span>
        <button class="week-nav-btn" @click="shiftWeek(1)">→</button>
      </div>
      <button class="btn-primary" @click="handleSave">{{ saved ? t('plan.saved') : t('plan.save') }}</button>
    </div>

    <div v-if="canEdit" class="plan-grid">
      <div v-for="day in days" :key="day.name" class="plan-day">
        <div class="plan-day-header">{{ day.name }}<span style="font-weight: 400; color: #888; margin-left: 6px; font-size: 10px">{{ day.date.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short' }) }}</span></div>
        <div v-for="slot in day.slots" :key="slot" class="plan-slot">
          <div class="plan-slot-label">{{ slotLabel(slot) }}</div>
          <input v-model="draft[planKey(day.date, slot)]" type="text" :placeholder="t('plan.name_ph')">
        </div>
      </div>
    </div>

    <div v-if="hasSummaryData" style="margin-top: 20px; border-top: 1px solid #2a2a2a; padding-top: 16px">
      <p style="font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px">{{ t('plan.summary') }}</p>
      <div style="display: flex; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid #2a2a2a">
        <div v-for="(day, i) in summaryDays" :key="day.name" style="flex: 1" :style="i < 4 ? 'border-right:1px solid #2a2a2a' : ''">
          <div class="plan-day-header" style="text-align: center">{{ day.name }}</div>
          <div v-for="(val, j) in day.slotValues" :key="j" style="padding: 8px 10px; border-top: 1px solid #2a2a2a">
            <div class="plan-slot-label">{{ slotLabel(day.slots[j]) }}</div>
            <div style="font-size: 12px; font-weight: 500" :style="val === '—' ? 'color:#444' : 'color:#f0ece3'">{{ val }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-nav-btn { background: transparent; border: 1px solid #444; color: #ccc; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
.plan-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.plan-day { background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border); overflow: hidden; }
.plan-day-header { background: var(--color-surface-raised); padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--color-primary-hover); border-bottom: 1px solid var(--color-border); }
.plan-slot { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.plan-slot:last-child { border-bottom: none; }
.plan-slot-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 5px; }
.plan-slot input { width: 100%; padding: 6px 8px; font-size: 12px; }
</style>
