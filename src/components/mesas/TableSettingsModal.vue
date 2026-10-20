<script setup>
import { ref, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  sections: { type: Array, required: true },
})
const emit = defineEmits(['close', 'save'])
const { t } = useI18n()

const draft = ref([])
const newSectionName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    draft.value = JSON.parse(JSON.stringify(props.sections))
    newSectionName.value = ''
  },
)

function addSection() {
  const name = newSectionName.value.trim()
  if (!name) return
  draft.value.push({ id: Date.now(), name, tables: [] })
  newSectionName.value = ''
}

function deleteSection(id) {
  draft.value = draft.value.filter((s) => s.id !== id)
}

function addTable(sec) {
  sec.tables.push({ id: Date.now(), label: '', type: 'single' })
}

function deleteTable(sec, tableId) {
  sec.tables = sec.tables.filter((t) => t.id !== tableId)
}

function toggleTableType(tbl) {
  if (tbl.type === 'double') {
    tbl.type = 'single'
  } else {
    tbl.type = 'double'
    tbl.slots = tbl.slots || ['A', 'B']
  }
}

function handleSave() {
  const cleaned = draft.value
    .map((sec) => ({
      id: sec.id,
      name: sec.name,
      tables: sec.tables
        .map((tb) => {
          const obj = { id: tb.id, label: tb.label, type: tb.type || 'single' }
          if (obj.type === 'double') obj.slots = [tb.slots?.[0] || 'A', tb.slots?.[1] || 'B']
          return obj
        })
        .filter((tb) => tb.label.trim() !== ''),
    }))
    .filter((sec) => sec.name.trim() !== '')
  emit('save', cleaned)
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 460px">
      <h2>{{ t('table_modal.title') }}</h2>
      <div class="modal-sub">{{ t('table_modal.subtitle') }}</div>
      <div style="max-height: 320px; overflow-y: auto">
        <div v-for="sec in draft" :key="sec.id" class="settings-section">
          <div class="settings-section-header">
            <input v-model="sec.name" class="sec-rename-input" type="text">
            <button class="sec-btn danger" @click="deleteSection(sec.id)">{{ t('tables.delete_section') }}</button>
          </div>
          <div class="settings-tables-list">
            <template v-for="tb in sec.tables" :key="tb.id">
              <div class="tbl-settings-row">
                <input v-model="tb.label" class="tbl-num-inp" type="text" :placeholder="t('res_modal.name_ph')">
                <button class="tbl-del-btn" @click="deleteTable(sec, tb.id)">✕</button>
              </div>
              <div class="tbl-type-row">
                <select class="tbl-type-sel" :value="tb.type || 'single'" @change="toggleTableType(tb)">
                  <option value="single">{{ t('tables.single') }}</option>
                  <option value="double">{{ t('tables.double') }}</option>
                </select>
              </div>
              <div v-if="tb.type === 'double'" class="tbl-slots-row" style="display: flex; gap: 6px">
                <input v-model="tb.slots[0]" class="tbl-slot-inp" type="text" placeholder="A">
                <input v-model="tb.slots[1]" class="tbl-slot-inp" type="text" placeholder="B">
              </div>
            </template>
            <button class="tbl-add-btn" @click="addTable(sec)">{{ t('tables.add_table') }}</button>
          </div>
        </div>
      </div>
      <div class="add-section-row">
        <input v-model="newSectionName" type="text" :placeholder="t('table_modal.new_section_ph')" @keydown.enter="addSection">
        <button @click="addSection">{{ t('table_modal.add_section') }}</button>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
        <button class="btn-save" @click="handleSave">{{ t('modal.save') }}</button>
      </div>
    </div>
  </div>
</template>
