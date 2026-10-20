<script setup>
import { ref, computed, watch } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../i18n'
import { getMondayOfWeek, getWeekDates, getWeeksInMonth, deriveSlotLabels } from '../utils/plan'
import PlanWeekRow from '../components/plan/PlanWeekRow.vue'

const puro = usePuroStore()
const auth = useAuthStore()
const { t, getLangLocale, getDayName } = useI18n()

const canEdit = computed(() => auth.role === 'admin' || auth.role === 'manager')
const offset = ref(0)

// Reset navigation whenever the business-configured frequency changes —
// an old offset in "week" units means something different in "month" units.
watch(() => puro.business.frequency, () => { offset.value = 0 })

function buildWeekDays(weekStart, restrictToMonth = null) {
  return getWeekDates(weekStart)
    .map((date, i) => ({ date, isoWeekday: i + 1 }))
    .filter(({ isoWeekday }) => puro.business.openDays.includes(isoWeekday))
    .filter(({ date }) => restrictToMonth === null || date.getMonth() === restrictToMonth)
    .map(({ date, isoWeekday }) => ({
      date,
      name: getDayName(isoWeekday),
      slotLabels: deriveSlotLabels(puro.business.staffing[isoWeekday] || []),
    }))
}

const weeks = computed(() => {
  const freq = puro.business.frequency
  if (freq === 'biweekly') {
    return [
      buildWeekDays(getMondayOfWeek(offset.value * 2)),
      buildWeekDays(getMondayOfWeek(offset.value * 2 + 1)),
    ]
  }
  if (freq === 'monthly' || freq === 'quarterly') {
    const now = new Date()
    const monthDate = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
    return getWeeksInMonth(monthDate).map((weekStart) => buildWeekDays(weekStart, monthDate.getMonth()))
  }
  return [buildWeekDays(getMondayOfWeek(offset.value))]
})

const periodLabel = computed(() => {
  const freq = puro.business.frequency
  const locale = getLangLocale()
  if (freq === 'monthly' || freq === 'quarterly') {
    const now = new Date()
    const monthDate = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
    return monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }
  const spanWeeks = freq === 'biweekly' ? 2 : 1
  const start = getMondayOfWeek(freq === 'biweekly' ? offset.value * 2 : offset.value)
  const end = new Date(start)
  end.setDate(end.getDate() + spanWeeks * 7 - 1)
  return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
})

function shift(dir) {
  offset.value += dir
}

function handleEdit() {
  puro.persist()
}
</script>

<template>
  <div class="content active">
    <template v-if="canEdit">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px">
        <div style="display: flex; align-items: center; gap: 10px">
          <button class="week-nav-btn" @click="shift(-1)">←</button>
          <span style="font-size: 13px; color: #aaa">{{ periodLabel }}</span>
          <button class="week-nav-btn" @click="shift(1)">→</button>
        </div>
        <button v-if="puro.planLocked" class="btn-secondary" @click="puro.unlockPlan()">{{ t('plan.unlock') }}</button>
        <button v-else class="btn-primary" @click="puro.lockPlan()">{{ t('plan.lock') }}</button>
      </div>

      <div v-if="puro.planLocked" style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px">{{ t('plan.locked_notice') }}</div>

      <PlanWeekRow
        v-for="(week, i) in weeks"
        :key="i"
        :days="week"
        :data-source="puro.planDraft"
        :editable="!puro.planLocked"
        @edit="handleEdit"
      />
    </template>

    <template v-else>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px">
        <button class="week-nav-btn" @click="shift(-1)">←</button>
        <span style="font-size: 13px; color: #aaa">{{ periodLabel }}</span>
        <button class="week-nav-btn" @click="shift(1)">→</button>
      </div>
      <PlanWeekRow
        v-for="(week, i) in weeks"
        :key="i"
        :days="week"
        :data-source="puro.planPublished"
        :editable="false"
      />
    </template>
  </div>
</template>

<style scoped>
.week-nav-btn { background: transparent; border: 1px solid #444; color: #ccc; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
</style>
