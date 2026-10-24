<script setup>
import { ref, computed } from 'vue'
import { usePuroStore } from '../stores/puro'
import { allTables, resTableIds } from '../utils/tables'
import { todayStr } from '../utils/time'
import { useI18n } from '../i18n'
import SectionPills from '../components/layout/SectionPills.vue'
import TableGrid from '../components/reservations/TableGrid.vue'
import BookTimeline from '../components/reservations/BookTimeline.vue'
import DetailPanel from '../components/reservations/DetailPanel.vue'
import ReservationModal from '../components/reservations/ReservationModal.vue'
import FloorPlanCanvas from '../components/floorplan/FloorPlanCanvas.vue'

const puro = usePuroStore()
const { t } = useI18n()

const filterDate = ref(todayStr())
const activeSection = ref('all')
const activeView = ref('grid')
const selectedTableId = ref(null)

const allTablesList = computed(() => allTables(puro.sections))
const selectedTable = computed(() => allTablesList.value.find((x) => x.id === selectedTableId.value) || null)
const selectedTableSection = computed(
  () => puro.sections.find((s) => s.tables.some((x) => x.id === selectedTableId.value)) || null,
)
const selectedTableReservations = computed(() => {
  if (!selectedTableId.value) return []
  return puro.reservations
    .filter((r) => resTableIds(r).includes(selectedTableId.value) && r.date === filterDate.value)
    .sort((a, b) => a.from.localeCompare(b.from))
})

function selectTable(id) {
  selectedTableId.value = selectedTableId.value === id ? null : id
}

function setView(view) {
  activeView.value = view
  selectedTableId.value = null
}

const modalOpen = ref(false)
const modalTableId = ref(null)
const modalSlot = ref(undefined)

function openModal(tableId = null, slot = undefined) {
  modalTableId.value = tableId
  modalSlot.value = slot
  modalOpen.value = true
}

function handleSave(payload) {
  puro.addReservation(payload)
  modalOpen.value = false
}
</script>

<template>
  <div class="content active">
    <div class="toolbar">
      <input v-model="filterDate" type="date" @change="selectedTableId = null">
      <div class="view-toggle">
        <button class="view-btn" :class="{ active: activeView === 'grid' }" title="Grid" @click="setView('grid')">⊞</button>
        <button class="view-btn" :class="{ active: activeView === 'book' }" title="Book" @click="setView('book')">☰</button>
        <button class="view-btn" :class="{ active: activeView === 'floor' }" :title="t('floorplan.view_label')" @click="setView('floor')">▦</button>
      </div>
      <button class="btn-primary" @click="openModal()">{{ t('reservations.new') }}</button>
    </div>

    <SectionPills :sections="puro.sections" :active="activeSection" @update:active="activeSection = $event" />

    <template v-if="activeView === 'grid'">
      <TableGrid
        :sections="puro.sections"
        :active-section="activeSection"
        :reservations="puro.reservations"
        :date="filterDate"
        :selected-table-id="selectedTableId"
        @select="selectTable"
      />
    </template>
    <template v-else-if="activeView === 'floor'">
      <FloorPlanCanvas
        :elements="puro.floorPlan.elements"
        :sections="puro.sections"
        :editable="false"
        @select-table="selectTable"
      />
    </template>
    <BookTimeline
      v-else
      :sections="puro.sections"
      :active-section="activeSection"
      :reservations="puro.reservations"
      :date="filterDate"
      :restaurant-hours="puro.business.hours"
      :all-tables="allTablesList"
      @toggle="puro.toggleResStatus"
      @delete="puro.deleteReservation"
      @open="(tableId, slot) => openModal(tableId, slot)"
    />
    <DetailPanel
      v-if="selectedTable"
      :table="selectedTable"
      :section="selectedTableSection"
      :reservations="selectedTableReservations"
      @add="openModal(selectedTableId)"
      @toggle="puro.toggleResStatus"
      @delete="puro.deleteReservation"
      @close="selectedTableId = null"
    />

    <ReservationModal
      :open="modalOpen"
      :sections="puro.sections"
      :default-date="filterDate"
      :initial-table-id="modalTableId"
      :initial-slot="modalSlot"
      @close="modalOpen = false"
      @save="handleSave"
    />
  </div>
</template>
