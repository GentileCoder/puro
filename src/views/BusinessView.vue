<script setup>
import { reactive, ref, watch } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useI18n } from '../i18n'
import { deriveSlotLabels } from '../utils/plan'

const puro = usePuroStore()
const { t, getDayName } = useI18n()

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly']

const draft = reactive({ openDays: [], hours: { open: '', close: '' }, staffing: {}, frequency: 'weekly' })
const saved = ref(false)

function seedFromStore() {
  draft.openDays = [...puro.business.openDays]
  draft.hours = { ...puro.business.hours }
  draft.staffing = JSON.parse(JSON.stringify(puro.business.staffing))
  draft.frequency = puro.business.frequency
}
seedFromStore()
// Re-seed once the store's initial load actually resolves, in case this
// view mounted before it did (the draft above would otherwise be stuck on
// defaults) — draft edits made in that brief window get overwritten, a
// rare, minor cost worth accepting rather than a more complex guard.
watch(() => puro.syncStatus, (status) => { if (status === 'synced') seedFromStore() })

function toggleDay(day) {
  const idx = draft.openDays.indexOf(day)
  if (idx === -1) {
    draft.openDays.push(day)
    draft.openDays.sort((a, b) => a - b)
    if (!draft.staffing[day]) draft.staffing[day] = ['fijo']
  } else {
    draft.openDays.splice(idx, 1)
  }
}

function addSlot(day) {
  if (!draft.staffing[day]) draft.staffing[day] = []
  draft.staffing[day].push('fijo')
}

function removeSlot(day, index) {
  draft.staffing[day].splice(index, 1)
}

function handleSave() {
  puro.saveBusiness({
    openDays: [...draft.openDays],
    hours: { ...draft.hours },
    staffing: JSON.parse(JSON.stringify(draft.staffing)),
    frequency: draft.frequency,
  })
  saved.value = true
  setTimeout(() => { saved.value = false }, 1500)
}
</script>

<template>
  <div class="content active">
    <div class="toolbar" style="justify-content: space-between">
      <h2 style="font-size: 16px; font-weight: 700">{{ t('business.title') }}</h2>
      <button class="btn-primary" @click="handleSave">{{ saved ? t('business.saved') : t('business.save') }}</button>
    </div>

    <div class="settings-section" style="padding: 14px">
      <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 8px">{{ t('business.open_days') }}</label>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px">
        <button
          v-for="day in ALL_DAYS"
          :key="day"
          class="pill"
          :class="{ active: draft.openDays.includes(day) }"
          @click="toggleDay(day)"
        >{{ getDayName(day) }}</button>
      </div>

      <div class="hours-settings-row">
        <div><label>{{ t('settings.open_time') }}</label><input v-model="draft.hours.open" type="time"></div>
        <div><label>{{ t('settings.close_time') }}</label><input v-model="draft.hours.close" type="time"></div>
      </div>
    </div>

    <div class="settings-section" style="padding: 14px; margin-top: 10px">
      <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 8px">{{ t('business.frequency') }}</label>
      <select v-model="draft.frequency" style="margin-bottom: 4px">
        <option v-for="f in FREQUENCIES" :key="f" :value="f">{{ t('business.frequency_' + f) }}</option>
      </select>
      <p v-if="draft.frequency === 'monthly'" style="font-size: 11px; color: var(--color-text-muted); margin-top: 6px">{{ t('business.frequency_hint_monthly') }}</p>
      <p v-if="draft.frequency === 'quarterly'" style="font-size: 11px; color: var(--color-text-muted); margin-top: 6px">{{ t('business.frequency_hint_quarterly') }}</p>
    </div>

    <div class="settings-section" style="padding: 14px; margin-top: 10px">
      <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 10px">{{ t('business.staffing') }}</label>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px">
        <div v-for="day in draft.openDays" :key="day" class="settings-section" style="padding: 10px">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px">{{ getDayName(day) }}</div>
          <div
            v-for="(label, i) in deriveSlotLabels(draft.staffing[day] || [])"
            :key="i"
            style="margin-bottom: 8px"
          >
            <div style="font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px">{{ label }}</div>
            <div style="display: flex; gap: 6px; align-items: center">
              <select v-model="draft.staffing[day][i]" style="flex: 1; font-size: 12px">
                <option value="fijo">{{ t('business.slot_fijo') }}</option>
                <option value="springer">{{ t('business.slot_springer') }}</option>
              </select>
              <button class="tbl-del-btn" @click="removeSlot(day, i)">✕</button>
            </div>
          </div>
          <button class="tbl-add-btn" @click="addSlot(day)">{{ t('business.add_slot') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
