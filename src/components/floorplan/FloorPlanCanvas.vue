<script setup>
import { computed, ref } from 'vue'
import { usePuroStore } from '../../stores/puro'
import { allTables } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { CANVAS_WIDTH, CANVAS_HEIGHT, chairPositions, CHAIR_RADIUS } from '../../utils/floorplan'
import FloorPlanPalette from './FloorPlanPalette.vue'
import FloorPlanElementPanel from './FloorPlanElementPanel.vue'

const props = defineProps({
  elements: { type: Array, required: true },
  sections: { type: Array, required: true },
  editable: { type: Boolean, default: false },
})
// Mirrors MesasGrid.vue's emits for a single table / a double table, so
// either parent view (Mesas, Reservations) wires this in with near-zero
// new logic of its own.
const emit = defineEmits(['select-table', 'open-double-picker'])
const puro = usePuroStore()
const { t } = useI18n()

const svgRef = ref(null)
const selectedId = ref(null)
const selected = computed(() => props.elements.find((e) => e.id === selectedId.value) || null)

const tablesById = computed(() => {
  const map = {}
  allTables(props.sections).forEach((tbl) => { map[tbl.id] = tbl })
  return map
})

function labelFor(el) {
  return el.type === 'table' ? tablesById.value[el.tableId]?.label || '?' : ''
}

// Names the selected element for the properties panel's header — e.g.
// "Table 15" vs. just "Wall" — so it reads unmistakably as "editing this
// one element", distinct from the palette's facility-wide new-table default.
const selectedTitle = computed(() => {
  if (!selected.value) return ''
  if (selected.value.type === 'table') return `${t('tables.table')} ${labelFor(selected.value)}`
  return t(`floorplan.type_${selected.value.type}`)
})

function elementChairs(el) {
  return el.type === 'table' ? chairPositions(el) : []
}

function handleElementClick(el) {
  if (props.editable) return
  if (el.type !== 'table') return
  const table = tablesById.value[el.tableId]
  if (!table) return
  if (table.type === 'double') emit('open-double-picker', table)
  else emit('select-table', table.id)
}

// --- Drag (edit mode only) ---
// Converts a pointer event's client coordinates into the SVG's own logical
// viewBox space, so dragging works correctly regardless of how the
// responsive viewBox is currently scaled on screen.
function toLocalPoint(evt) {
  const svg = svgRef.value
  const pt = svg.createSVGPoint()
  pt.x = evt.clientX
  pt.y = evt.clientY
  return pt.matrixTransform(svg.getScreenCTM().inverse())
}

const dragging = ref(null)

function startDrag(el, evt) {
  if (!props.editable) return
  selectedId.value = el.id
  const p = toLocalPoint(evt)
  dragging.value = { id: el.id, startX: p.x, startY: p.y, origX: el.x, origY: el.y }
  evt.currentTarget.setPointerCapture?.(evt.pointerId)
}

function onDrag(evt) {
  if (!dragging.value) return
  const p = toLocalPoint(evt)
  puro.updateFloorPlanElement(dragging.value.id, {
    x: dragging.value.origX + (p.x - dragging.value.startX),
    y: dragging.value.origY + (p.y - dragging.value.startY),
  })
}

function endDrag() {
  dragging.value = null
}

function handleBackgroundClick() {
  selectedId.value = null
}

function handlePanelUpdate(patch) {
  if (selected.value) puro.updateFloorPlanElement(selected.value.id, patch)
}

function handlePanelDelete() {
  if (!selected.value) return
  puro.removeFloorPlanElement(selected.value.id)
  selectedId.value = null
}

// Positions the properties panel right beside the selected element (in
// actual screen pixels, via the SVG's CTM) instead of pinning it to a fixed
// corner — a fixed corner goes off-screen once the canvas is tall enough
// to scroll. Reading selected.value.x/y here is what makes this recompute
// whenever selection changes or the element is dragged.
const PANEL_WIDTH = 150
const PANEL_HEIGHT = 230
const panelStyle = computed(() => {
  const el = selected.value
  const svg = svgRef.value
  if (!el || !svg) return {}
  const pt = svg.createSVGPoint()
  pt.x = el.x
  pt.y = el.y
  const screen = pt.matrixTransform(svg.getScreenCTM())
  const wrapRect = svg.parentElement.getBoundingClientRect()
  let left = screen.x - wrapRect.left + 36
  let top = screen.y - wrapRect.top - PANEL_HEIGHT / 2
  if (left + PANEL_WIDTH > wrapRect.width) left = screen.x - wrapRect.left - PANEL_WIDTH - 36
  left = Math.max(8, left)
  top = Math.max(8, Math.min(top, wrapRect.height - PANEL_HEIGHT - 8))
  return { left: `${left}px`, top: `${top}px` }
})
</script>

<template>
  <div class="floorplan-wrap">
    <FloorPlanPalette v-if="editable" :sections="sections" :elements="elements" />
    <svg
      ref="svgRef"
      class="floorplan-svg"
      :class="{ editable }"
      :viewBox="`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`"
      @pointermove="onDrag"
      @pointerup="endDrag"
      @pointerleave="endDrag"
    >
      <rect x="0" y="0" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT" class="floorplan-bg" @click="handleBackgroundClick" />
      <g
        v-for="el in elements"
        :key="el.id"
        :transform="`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`"
        class="fp-el"
        :class="[`fp-${el.type}`, { selected: editable && selectedId === el.id, clickable: !editable && el.type === 'table' }]"
        @pointerdown="startDrag(el, $event)"
        @click.stop="handleElementClick(el)"
      >
        <rect v-if="el.type === 'wall'" :x="-el.width / 2" :y="-el.height / 2" :width="el.width" :height="el.height" class="fp-shape fp-wall-shape" />
        <rect v-else-if="el.type === 'door'" :x="-el.width / 2" :y="-el.height / 2" :width="el.width" :height="el.height" class="fp-shape fp-door-shape" />
        <rect v-else-if="el.type === 'window'" :x="-el.width / 2" :y="-el.height / 2" :width="el.width" :height="el.height" class="fp-shape fp-window-shape" />
        <template v-else-if="el.type === 'table'">
          <circle v-for="(c, i) in elementChairs(el)" :key="i" :cx="c.x" :cy="c.y" :r="CHAIR_RADIUS" class="fp-chair" />
          <ellipse v-if="el.shape === 'round'" :rx="el.width / 2" :ry="el.height / 2" class="fp-shape fp-table-shape" />
          <rect v-else :x="-el.width / 2" :y="-el.height / 2" :width="el.width" :height="el.height" rx="4" class="fp-shape fp-table-shape" />
          <text text-anchor="middle" dominant-baseline="central" class="fp-table-label">{{ labelFor(el) }}</text>
        </template>
      </g>
    </svg>
    <p v-if="!elements.length" class="floorplan-empty-hint">{{ t(editable ? 'floorplan.empty_hint' : 'floorplan.empty_hint_view') }}</p>
    <FloorPlanElementPanel v-if="editable && selected" :element="selected" :title="selectedTitle" :style="panelStyle" @update="handlePanelUpdate" @delete="handlePanelDelete" />
  </div>
</template>

<style scoped>
.floorplan-wrap { position: relative; }
.floorplan-svg { width: 100%; height: auto; aspect-ratio: 10 / 7; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); touch-action: none; }
.floorplan-bg { fill: transparent; }
.fp-el.clickable { cursor: pointer; }
.floorplan-svg.editable .fp-el { cursor: grab; }
.fp-shape { stroke: var(--color-border); stroke-width: 1.5; }
.fp-wall-shape { fill: var(--color-text-muted); }
.fp-door-shape { fill: #a9754a; }
.fp-window-shape { fill: #7ab4f5; opacity: 0.6; }
.fp-table-shape { fill: var(--color-surface-raised); stroke: var(--color-primary-hover); stroke-width: 2; }
.fp-el.selected .fp-table-shape, .fp-el.selected .fp-wall-shape, .fp-el.selected .fp-door-shape, .fp-el.selected .fp-window-shape { stroke: var(--color-primary); stroke-width: 3; }
.fp-chair { fill: var(--color-text-muted); opacity: 0.7; }
.fp-table-label { font-size: 13px; font-weight: 600; fill: var(--color-text); }
.floorplan-empty-hint { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 10px; }
</style>
