<script setup>
import { computed } from 'vue'
import { resTableIds } from '../../utils/tables'
import { resStatus } from '../../utils/reservations'
import { useI18n } from '../../i18n'

const props = defineProps({
  sections: { type: Array, required: true },
  activeSection: { type: [String, Number], required: true },
  reservations: { type: Array, required: true },
  date: { type: String, required: true },
  selectedTableId: { type: [Number, null], default: null },
})
const emit = defineEmits(['select'])
const { t } = useI18n()

const visibleSections = computed(() =>
  props.activeSection === 'all' ? props.sections : props.sections.filter((s) => s.id === props.activeSection),
)

function reservationsFor(tableId) {
  return props.reservations
    .filter((r) => resTableIds(r).includes(tableId) && r.date === props.date && r.status !== 'cancelled')
    .sort((a, b) => a.from.localeCompare(b.from))
}

// Fixed white text, not the theme accent color — the background already
// carries the status color, and a muted accent (e.g. Paper's grayish green)
// as text on its own dark-mixed chip isn't reliably legible at this size.
function statusColors(tableId) {
  const status = resStatus(tableId, props.date, props.reservations)
  if (status === 'free') return { background: 'var(--color-success-bg)', color: '#F5F5F5' }
  if (status === 'once') return { background: 'var(--color-warning-bg)', color: '#F5F5F5' }
  return { background: 'var(--color-danger-bg)', color: '#F5F5F5' }
}
</script>

<template>
  <div class="table-grid">
    <template v-for="sec in visibleSections" :key="sec.id">
      <div v-if="activeSection === 'all'" class="section-label">{{ sec.name }}</div>
      <button
        v-for="tbl in sec.tables"
        :key="tbl.id"
        class="tmesa"
        :class="{ selected: selectedTableId === tbl.id }"
        :style="statusColors(tbl.id)"
        @click="emit('select', tbl.id)"
      >
        <span class="tid">{{ tbl.label }}</span>
        <div class="tslots">
          <span v-if="!reservationsFor(tbl.id).length" class="tslot">{{ t('reservations.free') }}</span>
          <span v-for="r in reservationsFor(tbl.id)" :key="r.id" class="tslot">
            {{ r.openEnd ? `${r.from} →` : `${r.from}–${r.to}` }}
          </span>
        </div>
      </button>
    </template>
  </div>
</template>
