<script setup>
import { computed } from 'vue'
import { calcLanes } from '../../utils/reservations'
import { resTableIds } from '../../utils/tables'
import { timeToMinutes } from '../../utils/time'
import { useI18n } from '../../i18n'

const props = defineProps({
  row: { type: Object, required: true },
  allTables: { type: Array, required: true },
  openMin: { type: Number, required: true },
  closeMin: { type: Number, required: true },
  span: { type: Number, required: true },
})
const emit = defineEmits(['toggle', 'delete', 'open'])
const { t } = useI18n()

const rowClass = computed(() => {
  let rc = props.row.rc || ''
  if (props.row.connBelow && !rc.includes('double-a')) rc = `${rc} tl-linked-below`.trim()
  return rc
})

const sorted = computed(() => [...props.row.items].sort((a, b) => a.from.localeCompare(b.from)))
const laneCount = computed(() => calcLanes(sorted.value, props.closeMin))
const trackHeight = computed(() => laneCount.value * 72)

const gridLines = computed(() => {
  const lines = []
  for (let h = props.openMin + 60; h < props.closeMin; h += 60) {
    lines.push(((h - props.openMin) / props.span) * 100)
  }
  return lines
})

function otherLabels(r) {
  const otherIds = resTableIds(r).filter((id) => id !== props.row.tblId)
  return otherIds
    .map((id) => props.allTables.find((x) => x.id === id)?.label || id)
    .join(', ')
}

const bars = computed(() =>
  sorted.value.map((r) => {
    const fromM = timeToMinutes(r.from)
    const toM = r.openEnd ? props.closeMin : timeToMinutes(r.to)
    const left = Math.max(0, ((fromM - props.openMin) / props.span) * 100)
    const width = Math.max(0.5, Math.min(100 - left, ((toM - fromM) / props.span) * 100))
    const topPct = (r._lane / laneCount.value) * 100
    const hPct = (1 / laneCount.value) * 100
    const isWholeB = r._wholeRow === 'b'
    const isWhole = r._wholeRow !== undefined
    const others = resTableIds(r).filter((id) => id !== props.row.tblId)
    const isMulti = others.length > 0
    const noBot = (isWhole && r._wholeRow === 'a') || (props.row.connBelow && props.row.connBelow.includes(r.id))
    const noTop = isWholeB || (props.row.connAbove && props.row.connAbove.includes(r.id))
    return {
      r,
      style: { left: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%`, top: `${topPct.toFixed(2)}%`, height: `${hPct.toFixed(2)}%` },
      cls: ['tl-res', r.openEnd && 'open-end', isWhole && 'whole', isWholeB && 'whole-b', isMulti && 'multi-tbl', noBot && 'no-br-bot', noTop && 'no-br-top'].filter(Boolean),
      isMulti,
      otherLabels: isMulti ? otherLabels(r) : '',
      timeStr: r.openEnd ? `${r.from} →` : `${r.from}–${r.to}`,
      empty: isWholeB || noTop,
    }
  }),
)
</script>

<template>
  <div class="tl-row" :class="rowClass">
    <div class="tl-row-label">
      <strong>{{ row.tblLabel }}</strong>
      <span v-if="row.slotName" class="res-book-slot">{{ row.slotName }}</span>
    </div>
    <div class="tl-track" :style="{ height: trackHeight + 'px' }" @click="emit('open', row.tblId, row.slot)">
      <div v-for="(pct, i) in gridLines" :key="i" class="tl-grid-line" :style="{ left: pct.toFixed(1) + '%' }"></div>
      <div
        v-for="bar in bars"
        :key="bar.r.id"
        :class="bar.cls"
        :style="bar.style"
        @click.stop="bar.empty ? null : null"
      >
        <template v-if="!bar.empty">
          <div class="tl-res-time">
            {{ bar.timeStr }}
            <span v-if="bar.isMulti" class="res-multi-badge">+{{ bar.otherLabels }}</span>
          </div>
          <div class="tl-res-name">{{ bar.r.name }} · {{ bar.r.guests }} {{ t('reservations.pax') }}</div>
          <div class="tl-res-foot">
            <span class="res-badge" :class="bar.r.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending'" style="font-size: 9px; padding: 1px 4px">
              {{ t(bar.r.status === 'confirmed' ? 'reservations.confirmed' : 'reservations.pending') }}
            </span>
            <button class="qty-btn" @click.stop="emit('toggle', bar.r.id)">{{ bar.r.status === 'confirmed' ? '⟳' : '✓' }}</button>
            <button class="qty-btn" style="color: #fca5a5" @click.stop="emit('delete', bar.r.id)">✕</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
