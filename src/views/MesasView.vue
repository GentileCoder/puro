<script setup>
import { ref, computed } from 'vue'
import { usePuroStore } from '../stores/puro'
import { allTables, getOrderKey, orderTotal } from '../utils/tables'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../i18n'
import SectionPills from '../components/layout/SectionPills.vue'
import MesasGrid from '../components/mesas/MesasGrid.vue'
import OrderView from '../components/mesas/OrderView.vue'
import PayModal from '../components/mesas/PayModal.vue'
import TableSettingsModal from '../components/mesas/TableSettingsModal.vue'
import TableSlotPickerModal from '../components/mesas/TableSlotPickerModal.vue'
import FloorPlanCanvas from '../components/floorplan/FloorPlanCanvas.vue'

const puro = usePuroStore()
const auth = useAuthStore()
const { t } = useI18n()

const activeSection = ref('all')
const activeView = ref('grid')
const floorEditMode = ref(false)
const currentTableId = ref(null)
const currentSlot = ref(null)
const inOrderView = ref(false)
const payOpen = ref(false)
const settingsOpen = ref(false)
const slotPickerTable = ref(null)

const canConfigure = computed(() => auth.role === 'admin')
// Broader than canConfigure — matches PlanView's canEdit convention, since
// the floor plan is a layout/design decision admin and manager should both
// be able to make, not a stricter admin-only setting like table CRUD.
const canEditFloor = computed(() => auth.role === 'admin' || auth.role === 'manager')

const currentTable = computed(() => allTables(puro.sections).find((x) => x.id === currentTableId.value) || null)
const currentSection = computed(() => puro.sections.find((s) => s.tables.some((x) => x.id === currentTableId.value)) || null)
const currentOrder = computed(() => puro.openTables[getOrderKey(currentTableId.value, currentSlot.value)] || null)

const orderTitle = computed(() => {
  if (!currentTable.value) return ''
  let label = `${t('tables.table')} ${currentTable.value.label}`
  if (currentTable.value.type === 'double') {
    const slotNames = currentTable.value.slots || ['A', 'B']
    label += currentSlot.value !== null ? ` · ${slotNames[currentSlot.value]}` : ` (${t('tables.whole')})`
  }
  return label
})

function openOrder(tableId, slot) {
  currentTableId.value = tableId
  currentSlot.value = slot === 0 || slot === 1 ? slot : null
  inOrderView.value = true
}

function openDoublePicker(tbl) {
  slotPickerTable.value = tbl
}

function pickSlot(slot) {
  const tableId = slotPickerTable.value.id
  slotPickerTable.value = null
  openOrder(tableId, slot)
}

function closeOrder() {
  puro.discardEmptyOrder(currentTableId.value, currentSlot.value)
  inOrderView.value = false
  currentTableId.value = null
  currentSlot.value = null
}

function handleConfirm(pendingItems) {
  puro.confirmAddToOrder(currentTableId.value, currentSlot.value, pendingItems)
  closeOrder()
}

function handleChangeQty(artId, delta) {
  puro.changeQty(currentTableId.value, currentSlot.value, artId, delta)
}

function handlePay(method) {
  const slotSuffix = currentTable.value?.type === 'double'
    ? currentSlot.value !== null
      ? ` · ${(currentTable.value.slots || ['A', 'B'])[currentSlot.value]}`
      : ` (${t('tables.whole')})`
    : ''
  const label = (currentTable.value ? currentTable.value.label : currentTableId.value) + slotSuffix
  puro.closeTable(currentTableId.value, currentSlot.value, method, label)
  payOpen.value = false
  closeOrder()
}

function handleSaveSettings(newSections) {
  puro.saveTableSettings(newSections)
  settingsOpen.value = false
  activeSection.value = 'all'
}

// A brand-new floor plan is just an empty box with nothing to click — drop
// straight into edit mode so the palette (and the "add your tables" hint)
// is visible immediately, instead of requiring a second click to discover it.
function openFloorView() {
  activeView.value = 'floor'
  if (canEditFloor.value && !puro.floorPlan.elements.length) floorEditMode.value = true
}
</script>

<template>
  <div class="content active">
    <template v-if="!inOrderView">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px">
        <div class="legend">
          <div class="leg"><div class="leg-dot" style="background: #e87c7c"></div><span>{{ t('tables.open') }}</span></div>
          <div class="leg"><div class="leg-dot" style="background: #7ed4a7"></div><span>{{ t('tables.free') }}</span></div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <div class="view-toggle">
            <button class="view-btn" :class="{ active: activeView === 'grid' }" title="Grid" @click="activeView = 'grid'; floorEditMode = false">⊞</button>
            <button class="view-btn" :class="{ active: activeView === 'floor' }" :title="t('floorplan.view_label')" @click="openFloorView">▦</button>
          </div>
          <button v-if="activeView === 'floor' && canEditFloor" class="btn-secondary" :class="{ 'btn-primary': floorEditMode }" @click="floorEditMode = !floorEditMode">{{ t('floorplan.edit_layout') }}</button>
          <button v-if="canConfigure" class="btn-secondary" @click="settingsOpen = true">{{ t('tables.configure') }}</button>
        </div>
      </div>
      <template v-if="activeView === 'grid'">
        <SectionPills :sections="puro.sections" :active="activeSection" @update:active="activeSection = $event" />
        <MesasGrid
          :sections="puro.sections"
          :active-section="activeSection"
          :open-tables="puro.openTables"
          @open="openOrder"
          @open-double-picker="openDoublePicker"
        />
      </template>
      <FloorPlanCanvas
        v-else
        :elements="puro.floorPlan.elements"
        :sections="puro.sections"
        :editable="floorEditMode && canEditFloor"
        @select-table="(id) => openOrder(id, null)"
        @open-double-picker="openDoublePicker"
      />
    </template>
    <OrderView
      v-else
      :title="orderTitle"
      :articulos="puro.articulos"
      :order="currentOrder"
      @back="closeOrder"
      @confirm="handleConfirm"
      @change-qty="handleChangeQty"
      @pay="payOpen = true"
    />

    <TableSlotPickerModal
      :open="!!slotPickerTable"
      :table="slotPickerTable"
      :open-tables="puro.openTables"
      @close="slotPickerTable = null"
      @pick="pickSlot"
    />
    <PayModal
      :open="payOpen"
      :total="currentOrder ? orderTotal(currentOrder.items) : 0"
      :subtitle="orderTitle"
      @close="payOpen = false"
      @pay="handlePay"
    />
    <TableSettingsModal
      :open="settingsOpen"
      :sections="puro.sections"
      @close="settingsOpen = false"
      @save="handleSaveSettings"
    />
  </div>
</template>
