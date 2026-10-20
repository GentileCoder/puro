<script setup>
import { ref, computed, watch } from 'vue'
import { allTables } from '../../utils/tables'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  sections: { type: Array, required: true },
  defaultDate: { type: String, required: true },
  initialTableId: { type: Number, default: null },
  initialSlot: { type: [Number, null], default: undefined },
})
const emit = defineEmits(['close', 'save'])
const { t } = useI18n()

const name = ref('')
const guests = ref(2)
const date = ref(props.defaultDate)
const from = ref('17:00')
const to = ref('19:00')
const openEnd = ref(false)
const notes = ref('')
const selectedTables = ref([])
const slot = ref('null')

const tables = computed(() => allTables(props.sections))
const singleTable = computed(() =>
  selectedTables.value.length === 1 ? tables.value.find((x) => x.id === selectedTables.value[0]) : null,
)
const isDouble = computed(() => singleTable.value?.type === 'double')
const slotOptions = computed(() => (isDouble.value ? singleTable.value.slots || ['A', 'B'] : []))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = ''
    guests.value = 2
    date.value = props.defaultDate
    from.value = '17:00'
    to.value = '19:00'
    openEnd.value = false
    notes.value = ''
    selectedTables.value = props.initialTableId ? [props.initialTableId] : []
    slot.value = props.initialSlot !== undefined && props.initialSlot !== null ? String(props.initialSlot) : 'null'
  },
)

function toggleTable(id) {
  const idx = selectedTables.value.indexOf(id)
  if (idx === -1) selectedTables.value.push(id)
  else selectedTables.value.splice(idx, 1)
}

function handleSave() {
  const tableIds = selectedTables.value.slice()
  const tableId = tableIds[0] || null
  const useSlot = isDouble.value && tableIds.length === 1 && slot.value !== 'null' ? parseInt(slot.value) : null
  emit('save', {
    name: name.value || t('reservations.no_name'),
    guests: parseInt(guests.value) || 1,
    date: date.value,
    from: from.value,
    to: openEnd.value ? '23:59' : to.value,
    openEnd: openEnd.value,
    tables: tableIds,
    table: tableId,
    slot: useSlot,
    notes: notes.value,
  })
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal">
      <h2>{{ t('res_modal.title') }}</h2>
      <label>{{ t('res_modal.name_label') }}</label>
      <input v-model="name" type="text" :placeholder="t('res_modal.name_ph')">
      <label>{{ t('res_modal.persons') }}</label>
      <input v-model="guests" type="number" min="1" max="30">
      <label>{{ t('res_modal.date') }}</label>
      <input v-model="date" type="date">
      <div class="time-row">
        <div>
          <label>{{ t('res_modal.from') }}</label>
          <input v-model="from" type="time">
        </div>
        <div v-if="!openEnd">
          <label>{{ t('res_modal.to') }}</label>
          <input v-model="to" type="time">
        </div>
        <div style="display: flex; align-items: flex-end; padding-bottom: 6px">
          <label class="open-end-label"><input v-model="openEnd" type="checkbox"><span>{{ t('res_modal.open_end') }}</span></label>
        </div>
      </div>
      <label>{{ t('res_modal.table') }}</label>
      <div class="table-picker-wrap">
        <template v-for="sec in sections" :key="sec.id">
          <div class="table-picker-section">{{ sec.name }}</div>
          <div class="table-picker-row">
            <button
              v-for="tb in sec.tables"
              :key="tb.id"
              type="button"
              class="table-picker-pill"
              :class="{ sel: selectedTables.includes(tb.id) }"
              @click="toggleTable(tb.id)"
            >{{ tb.label }}</button>
          </div>
        </template>
      </div>
      <div v-if="isDouble && selectedTables.length === 1">
        <label>{{ t('res_modal.slot') }}</label>
        <select v-model="slot">
          <option value="null">{{ t('tables.whole') }}</option>
          <option v-for="(sn, i) in slotOptions" :key="i" :value="String(i)">{{ sn }}</option>
        </select>
      </div>
      <label>{{ t('res_modal.details') }}</label>
      <textarea v-model="notes" :placeholder="t('res_modal.details_ph')"></textarea>
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
        <button class="btn-save" @click="handleSave">{{ t('modal.save') }}</button>
      </div>
    </div>
  </div>
</template>
