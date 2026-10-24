<script setup>
import { computed } from 'vue'
import { usePuroStore } from '../../stores/puro'
import { allTables } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { createWallElement, createDoorElement, createWindowElement, createTableElement } from '../../utils/floorplan'

const props = defineProps({
  sections: { type: Array, required: true },
  elements: { type: Array, required: true },
})
const puro = usePuroStore()
const { t } = useI18n()

// Real tables (from Tables tab settings) not yet placed on the floor plan —
// click one to drop it on the canvas, then drag it into position.
const unplacedTables = computed(() => {
  const placedIds = new Set(props.elements.filter((e) => e.type === 'table').map((e) => e.tableId))
  return allTables(props.sections).filter((tbl) => !placedIds.has(tbl.id))
})

// What a newly placed table looks like — most businesses use one uniform
// size/shape, so this is a single setting rather than per-table-type.
const defaultShape = computed(() => puro.floorPlan.defaultTable?.shape || 'round')
const defaultWidth = computed(() => puro.floorPlan.defaultTable?.width || 60)
const defaultHeight = computed(() => puro.floorPlan.defaultTable?.height || 60)

function num(v, fallback) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

function updateDefault(patch) {
  puro.setFloorPlanDefaultTable(patch)
}

function add(factory) {
  puro.addFloorPlanElement(factory())
}

function addTable(tbl) {
  puro.addFloorPlanElement(createTableElement(tbl, puro.floorPlan.defaultTable))
}
</script>

<template>
  <div class="fp-palette">
    <button class="btn-secondary" @click="add(createWallElement)">{{ t('floorplan.add_wall') }}</button>
    <button class="btn-secondary" @click="add(createDoorElement)">{{ t('floorplan.add_door') }}</button>
    <button class="btn-secondary" @click="add(createWindowElement)">{{ t('floorplan.add_window') }}</button>
    <div class="fp-default-group">
      <span class="fp-palette-sep">{{ t('floorplan.default_table') }}:</span>
      <select class="fp-default-sel" :value="defaultShape" @change="updateDefault({ shape: $event.target.value })">
        <option value="round">{{ t('floorplan.shape_round') }}</option>
        <option value="rect">{{ t('floorplan.shape_rect') }}</option>
      </select>
      <input type="number" min="10" class="fp-default-num" :value="defaultWidth" @input="updateDefault({ width: num($event.target.value, defaultWidth) })">
      <span class="fp-palette-sep">×</span>
      <input type="number" min="10" class="fp-default-num" :value="defaultHeight" @input="updateDefault({ height: num($event.target.value, defaultHeight) })">
    </div>
    <template v-if="unplacedTables.length">
      <span class="fp-palette-sep">{{ t('floorplan.add_table') }}:</span>
      <button v-for="tbl in unplacedTables" :key="tbl.id" class="btn-secondary" @click="addTable(tbl)">{{ tbl.label }}</button>
    </template>
  </div>
</template>

<style scoped>
.fp-palette { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
.fp-palette-sep { font-size: 11px; color: var(--color-text-muted); margin-left: 4px; }
.fp-default-group { display: flex; align-items: center; gap: 6px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 4px 8px; }
.fp-default-sel { font-size: 12px; padding: 4px 6px; }
.fp-default-num { width: 48px; font-size: 12px; padding: 4px 6px; }
</style>
