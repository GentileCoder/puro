<script setup>
import { computed } from 'vue'
import { resTableIds } from '../../utils/tables'
import { timeToMinutes, minutesToTime } from '../../utils/time'
import TimelineRow from './TimelineRow.vue'

const props = defineProps({
  sections: { type: Array, required: true },
  activeSection: { type: [String, Number], required: true },
  reservations: { type: Array, required: true },
  date: { type: String, required: true },
  restaurantHours: { type: Object, required: true },
  allTables: { type: Array, required: true },
})
const emit = defineEmits(['toggle', 'delete', 'open'])

const openMin = computed(() => timeToMinutes(props.restaurantHours.open))
const closeMin = computed(() => timeToMinutes(props.restaurantHours.close))
const span = computed(() => closeMin.value - openMin.value)

const ticks = computed(() => {
  if (span.value <= 0) return []
  const out = []
  for (let h = openMin.value; h <= closeMin.value; h += 60) {
    out.push({ label: minutesToTime(h), pct: ((h - openMin.value) / span.value) * 100 })
  }
  return out
})

// Builds one row per table (two rows for a double table, one per slot),
// then a second pass detects adjacency between consecutive rows so a
// multi-table reservation's connecting edge renders borderless across them.
// Ported from legacy renderBookView/renderTLRow as-is — the trickiest piece
// of ported logic in this app, don't "clean up" the algorithm mid-migration.
const rows = computed(() => {
  if (span.value <= 0) return []
  const secs = props.activeSection === 'all' ? props.sections : props.sections.filter((s) => s.id === props.activeSection)
  const out = []

  secs.forEach((sec) => {
    const secLabel = props.activeSection === 'all' ? sec.name : null
    let firstInSec = true
    sec.tables.forEach((tbl) => {
      const all = props.reservations.filter(
        (r) => resTableIds(r).includes(tbl.id) && r.date === props.date && r.status !== 'cancelled',
      )
      const secName = firstInSec ? secLabel : null
      firstInSec = false
      if (tbl.type === 'double') {
        const sn = tbl.slots || ['A', 'B']
        const whole = all.filter((r) => r.slot === null || r.slot === undefined)
        const s0 = all.filter((r) => r.slot === 0)
        const s1 = all.filter((r) => r.slot === 1)
        out.push({
          secName, tblLabel: tbl.label, slotName: sn[0], tblId: tbl.id, slot: 0, rc: 'double-a',
          items: [...s0.map((r) => ({ ...r })), ...whole.map((r) => ({ ...r, _wholeRow: 'a' }))],
        })
        out.push({
          secName: null, tblLabel: tbl.label, slotName: sn[1], tblId: tbl.id, slot: 1, rc: 'double-b',
          items: [...s1.map((r) => ({ ...r })), ...whole.map((r) => ({ ...r, _wholeRow: 'b' }))],
        })
      } else {
        out.push({ secName, tblLabel: tbl.label, slotName: null, tblId: tbl.id, slot: null, rc: '', items: all.map((r) => ({ ...r })) })
      }
    })
  })

  for (let i = 0; i < out.length - 1; i++) {
    const cur = out[i]
    const nxt = out[i + 1]
    const curIds = cur.items.filter((r) => resTableIds(r).length > 1 && r._wholeRow !== 'b').map((r) => r.id)
    const nxtIds = nxt.items.filter((r) => resTableIds(r).length > 1 && r._wholeRow !== 'b').map((r) => r.id)
    const shared = curIds.filter((id) => nxtIds.includes(id))
    if (shared.length) {
      cur.connBelow = shared
      nxt.connAbove = shared
    }
  }

  return out
})
</script>

<template>
  <div v-if="span > 0" class="tl-book-wrap">
    <div class="tl-header">
      <div class="tl-row-label"></div>
      <div class="tl-track-header">
        <div v-for="tick in ticks" :key="tick.label" class="tl-tick" :style="{ left: tick.pct.toFixed(1) + '%' }">{{ tick.label }}</div>
      </div>
    </div>
    <template v-for="row in rows" :key="row.tblId + '-' + row.slot">
      <div v-if="row.secName" class="res-book-section-label">{{ row.secName }}</div>
      <TimelineRow
        :row="row"
        :all-tables="allTables"
        :open-min="openMin"
        :close-min="closeMin"
        :span="span"
        @toggle="(id) => emit('toggle', id)"
        @delete="(id) => emit('delete', id)"
        @open="(tblId, slot) => emit('open', tblId, slot)"
      />
    </template>
  </div>
</template>

<style scoped>
.tl-book-wrap { background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border); overflow: hidden; }
.tl-header { display: flex; border-bottom: 2px solid var(--color-border); }
:deep(.tl-row) { display: flex; border-bottom: 1px solid var(--color-border); align-items: stretch; }
:deep(.tl-row:last-child) { border-bottom: none; }
:deep(.tl-row.double-a) { border-bottom: none; }
:deep(.tl-row.double-b) { border-bottom: 1px solid var(--color-border); }
:deep(.tl-row.tl-linked-below) { border-bottom: none; }
:deep(.tl-row-label) { width: 80px; flex-shrink: 0; padding: 8px 8px 8px 14px; font-size: 13px; display: flex; flex-direction: column; justify-content: center; gap: 3px; border-right: 1px solid var(--color-border); }
.tl-track-header { flex: 1; position: relative; height: 28px; }
.tl-tick { position: absolute; font-size: 10px; color: #4b5563; transform: translateX(-50%); top: 7px; white-space: nowrap; pointer-events: none; }
.tl-tick:first-child { transform: none; }
.tl-tick:last-child { transform: translateX(-100%); }
:deep(.tl-track) { flex: 1; position: relative; cursor: pointer; background: transparent; transition: background 0.1s; }
:deep(.tl-track:hover) { background: rgba(99, 102, 241, 0.03); }
:deep(.tl-grid-line) { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--color-border); pointer-events: none; }
:deep(.tl-res) { position: absolute; border-radius: 5px; border: 1px solid #2d333b; background: #232a35; padding: 3px 6px; overflow: hidden; box-sizing: border-box; transition: border-color 0.15s; z-index: 1; }
:deep(.tl-res:hover) { border-color: #4f5568; z-index: 2; }
:deep(.tl-res.open-end) { border-right-style: dashed; }
:deep(.tl-res.whole) { background: rgba(99, 102, 241, 0.22); border-color: var(--color-primary); }
:deep(.tl-res.whole-b) { background: rgba(99, 102, 241, 0.22); border-color: var(--color-primary); pointer-events: none; }
:deep(.tl-res.multi-tbl) { background: rgba(245, 158, 11, 0.18); border-color: #d97706; }
:deep(.tl-res.no-br-bot) { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom-color: transparent; }
:deep(.tl-res.no-br-top) { border-top-left-radius: 0; border-top-right-radius: 0; border-top: none; }
:deep(.tl-res-time) { font-size: 10px; font-weight: 600; color: var(--color-success-fg); white-space: nowrap; overflow: hidden; line-height: 1.4; }
:deep(.tl-res.open-end .tl-res-time) { color: #f0a04b; }
:deep(.tl-res-name) { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e6edf3; line-height: 1.3; }
:deep(.tl-res-foot) { display: flex; align-items: center; gap: 3px; margin-top: 2px; flex-wrap: wrap; }
:deep(.qty-btn) { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.res-book-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; padding: 8px 14px 6px; background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
:deep(.res-book-slot) { display: inline-block; margin-left: 5px; font-size: 10px; font-weight: 600; background: var(--color-border); color: var(--color-text-muted); padding: 1px 5px; border-radius: 4px; vertical-align: middle; }
</style>
