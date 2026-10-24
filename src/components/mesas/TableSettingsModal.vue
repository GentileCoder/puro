<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  sections: { type: Array, required: true },
})
const emit = defineEmits(['close', 'save'])
const { t } = useI18n()

const draft = ref([])
const newSectionName = ref('')
const activeSectionId = ref(null)
const bulkPrefix = ref('')
const bulkFrom = ref('')
const bulkTo = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    draft.value = JSON.parse(JSON.stringify(props.sections))
    newSectionName.value = ''
    activeSectionId.value = null
  },
)

const activeSection = computed(() => draft.value.find((s) => s.id === activeSectionId.value) || null)

function openSection(id) {
  activeSectionId.value = id
  bulkPrefix.value = ''
  bulkFrom.value = ''
  bulkTo.value = ''
}

function backToSections() {
  activeSectionId.value = null
}

function addSection() {
  const name = newSectionName.value.trim()
  if (!name) return
  draft.value.push({ id: Date.now(), name, tables: [] })
  newSectionName.value = ''
}

function deleteSection(id) {
  draft.value = draft.value.filter((s) => s.id !== id)
  if (activeSectionId.value === id) activeSectionId.value = null
}

function addTable(sec) {
  sec.tables.push({ id: Date.now(), label: '', type: 'single' })
}

// "10-20" instead of clicking + Add table eleven times — plain single
// tables, labeled with an optional prefix plus each number in the range.
function addTableRange(sec) {
  const from = parseInt(bulkFrom.value, 10)
  const to = parseInt(bulkTo.value, 10)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  for (let n = start; n <= end; n++) {
    sec.tables.push({ id: Date.now() + n, label: `${bulkPrefix.value}${n}`, type: 'single' })
  }
  bulkFrom.value = ''
  bulkTo.value = ''
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

function handleClose() {
  activeSectionId.value = null
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 460px">
      <h2>{{ t('table_modal.title') }}</h2>
      <div class="modal-sub">{{ t('table_modal.subtitle') }}</div>

      <template v-if="!activeSection">
        <p v-if="!draft.length" style="color: #666; font-size: 13px; text-align: center; padding: 24px">{{ t('table_modal.no_sections') }}</p>
        <div v-else class="art-cat-grid" style="margin: 12px 0; max-height: 320px; overflow-y: auto">
          <button v-for="sec in draft" :key="sec.id" class="art-cat-card" @click="openSection(sec.id)">
            <span class="art-cat-name">{{ sec.name }}</span>
            <span class="art-cat-count">{{ sec.tables.length }}</span>
          </button>
        </div>
        <div class="add-section-row">
          <input v-model="newSectionName" type="text" :placeholder="t('table_modal.new_section_ph')" @keydown.enter="addSection">
          <button @click="addSection">{{ t('table_modal.add_section') }}</button>
        </div>
      </template>

      <template v-else>
        <div class="settings-section-header" style="padding: 10px 0">
          <button class="sec-btn" @click="backToSections">← {{ t('table_modal.back') }}</button>
          <input v-model="activeSection.name" class="sec-rename-input" style="flex: 1; margin: 0 8px" type="text">
          <button class="sec-btn danger" @click="deleteSection(activeSection.id)">{{ t('tables.delete_section') }}</button>
        </div>
        <div class="settings-tables-list" style="max-height: 320px; overflow-y: auto; border-top: 1px solid var(--color-border)">
          <template v-for="tb in activeSection.tables" :key="tb.id">
            <div class="tbl-settings-row">
              <input v-model="tb.label" class="tbl-num-inp" type="text" :placeholder="t('res_modal.name_ph')">
              <button class="tbl-del-btn" @click="deleteTable(activeSection, tb.id)">✕</button>
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
          <button class="tbl-add-btn" @click="addTable(activeSection)">{{ t('tables.add_table') }}</button>
          <div class="tbl-bulk-row">
            <input v-model="bulkPrefix" type="text" class="tbl-bulk-prefix" :placeholder="t('table_modal.bulk_prefix_ph')">
            <input v-model="bulkFrom" type="number" class="tbl-bulk-num" :placeholder="t('table_modal.bulk_from_ph')">
            <span class="tbl-bulk-dash">–</span>
            <input v-model="bulkTo" type="number" class="tbl-bulk-num" :placeholder="t('table_modal.bulk_to_ph')">
            <button class="sec-btn" @click="addTableRange(activeSection)">{{ t('table_modal.bulk_add') }}</button>
          </div>
        </div>
      </template>

      <div class="modal-actions">
        <button class="btn-cancel" @click="handleClose">{{ t('modal.cancel') }}</button>
        <button class="btn-save" @click="handleSave">{{ t('modal.save') }}</button>
      </div>
    </div>
  </div>
</template>
