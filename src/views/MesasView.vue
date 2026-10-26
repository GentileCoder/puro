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
import SplitBillPickerModal from '../components/mesas/SplitBillPickerModal.vue'
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
const splitPickerTable = ref(null)
// Captured once, the moment a table's order session begins (not on every
// sub-bill switch within it) — lets "Discard" roll the whole visit back,
// see beginTableSession()/discardSession() below.
const tableSessionSnapshot = ref(null)

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
  if (typeof currentSlot.value === 'string') {
    label = `${t('tables.table')} ${currentTable.value.label}.${currentSlot.value}`
  } else if (currentTable.value.type === 'double') {
    const slotNames = currentTable.value.slots || ['A', 'B']
    label += currentSlot.value !== null ? ` · ${slotNames[currentSlot.value]}` : ` (${t('tables.whole')})`
  }
  return label
})

// The other open bills for the table currently being viewed, when it's
// split — lets OrderView offer a quick switcher instead of forcing a trip
// back through the split picker for every bill.
const splitSiblings = computed(() => {
  if (typeof currentSlot.value !== 'string' || !currentTableId.value) return null
  const count = puro.splitTables[currentTableId.value]
  if (!count) return null
  return Array.from({ length: count }, (_, i) => {
    const slot = String(i)
    return {
      slot,
      label: `${currentTable.value?.label}.${i}`,
      hasItems: !!puro.openTables[getOrderKey(currentTableId.value, slot)],
    }
  })
})

// Splitting only makes sense while looking at the whole table, and only if
// it isn't already split (growing an existing split happens from the
// picker's "+ Add bill" instead).
const canStartSplit = computed(() => currentSlot.value === null && !puro.splitTables[currentTableId.value])

function openOrder(tableId, slot) {
  // Only snapshot on a genuinely fresh entry from the grid/floor plan/a
  // picker — openOrder() is also how splitting and switching bills work
  // while already inside the view, and those must stay part of the same
  // session, not start a new one.
  if (!inOrderView.value) beginTableSession(tableId, slot)
  currentTableId.value = tableId
  currentSlot.value = slot === 0 || slot === 1 || typeof slot === 'string' ? slot : null
  inOrderView.value = true
}

// Deep-snapshots everything about this table a session could touch: every
// sub-bill if it's currently split, or just the one key being opened
// otherwise. "Discard" restores exactly this.
function beginTableSession(tableId, slot) {
  const count = puro.splitTables[tableId] || 0
  const keys = count
    ? Array.from({ length: count }, (_, i) => getOrderKey(tableId, String(i)))
    : [getOrderKey(tableId, slot)]
  const orders = {}
  keys.forEach((k) => {
    orders[k] = puro.openTables[k] ? JSON.parse(JSON.stringify(puro.openTables[k])) : null
  })
  tableSessionSnapshot.value = { tableId, splitCount: count || null, orders }
}

function openDoublePicker(tbl) {
  slotPickerTable.value = tbl
}

function pickSlot(slot) {
  const tableId = slotPickerTable.value.id
  slotPickerTable.value = null
  openOrder(tableId, slot)
}

function openSplitPicker(tbl) {
  splitPickerTable.value = tbl
}

// The floor-plan view's click only ever hands back a bare tableId (unlike
// MesasGrid, which already knows per-table whether it's split) — route a
// split table to its picker instead of the stale "whole table" order.
function handleFloorPlanSelectTable(tableId) {
  if (puro.splitTables[tableId]) {
    const tbl = allTables(puro.sections).find((t) => t.id === tableId)
    if (tbl) {
      openSplitPicker(tbl)
      return
    }
  }
  openOrder(tableId, null)
}

function pickSplitBill(slot) {
  const tableId = splitPickerTable.value.id
  splitPickerTable.value = null
  openOrder(tableId, slot)
}

function handleAddSplitBill() {
  if (splitPickerTable.value) puro.addSplitBill(splitPickerTable.value.id)
}

function handleSplit(count) {
  puro.splitTable(currentTableId.value, count)
  openOrder(currentTableId.value, '0')
}

function handleAddBillFromOrder() {
  // Same as the picker's "+ Add bill", but reachable without leaving the
  // order screen — the new bill shows up in the switcher pill row right
  // away since splitSiblings is derived from puro.splitTables directly.
  puro.addSplitBill(currentTableId.value)
}

function handleMoveItem({ itemId, toSlot }) {
  puro.moveOrderItem(currentTableId.value, currentSlot.value, toSlot, itemId)
}

function handleSwitchSplit(slot) {
  // Same cleanup closeOrder() does on the way out — switching bills without
  // leaving OrderView shouldn't leave a stray empty order behind either.
  puro.discardEmptyOrder(currentTableId.value, currentSlot.value)
  openOrder(currentTableId.value, slot)
}

function closeOrder() {
  puro.discardEmptyOrder(currentTableId.value, currentSlot.value)
  tableSessionSnapshot.value = null
  inOrderView.value = false
  currentTableId.value = null
  currentSlot.value = null
}

// Undoes everything done since this table's order session began — every
// item added/moved, every bill added or split — not just the current bill.
function handleDiscard() {
  if (tableSessionSnapshot.value) puro.restoreTableSnapshot(tableSessionSnapshot.value)
  tableSessionSnapshot.value = null
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
  let slotSuffix = ''
  if (typeof currentSlot.value === 'string') {
    slotSuffix = `.${currentSlot.value}`
  } else if (currentTable.value?.type === 'double') {
    slotSuffix = currentSlot.value !== null
      ? ` · ${(currentTable.value.slots || ['A', 'B'])[currentSlot.value]}`
      : ` (${t('tables.whole')})`
  }
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
          :split-tables="puro.splitTables"
          @open="openOrder"
          @open-double-picker="openDoublePicker"
          @open-split-picker="openSplitPicker"
        />
      </template>
      <FloorPlanCanvas
        v-else
        :elements="puro.floorPlan.elements"
        :sections="puro.sections"
        :editable="floorEditMode && canEditFloor"
        @select-table="handleFloorPlanSelectTable"
        @open-double-picker="openDoublePicker"
      />
    </template>
    <OrderView
      v-else
      :title="orderTitle"
      :articulos="puro.articulos"
      :categories="puro.categories"
      :order="currentOrder"
      :split-siblings="splitSiblings"
      :active-split-slot="typeof currentSlot === 'string' ? currentSlot : null"
      :can-start-split="canStartSplit"
      @back="closeOrder"
      @discard="handleDiscard"
      @confirm="handleConfirm"
      @change-qty="handleChangeQty"
      @pay="payOpen = true"
      @split="handleSplit"
      @switch-split="handleSwitchSplit"
      @add-bill="handleAddBillFromOrder"
      @move-item="handleMoveItem"
    />

    <TableSlotPickerModal
      :open="!!slotPickerTable"
      :table="slotPickerTable"
      :open-tables="puro.openTables"
      @close="slotPickerTable = null"
      @pick="pickSlot"
    />
    <SplitBillPickerModal
      :open="!!splitPickerTable"
      :table="splitPickerTable"
      :open-tables="puro.openTables"
      :count="splitPickerTable ? puro.splitTables[splitPickerTable.id] || 0 : 0"
      @close="splitPickerTable = null"
      @pick="pickSplitBill"
      @add-bill="handleAddSplitBill"
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
