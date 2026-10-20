<script setup>
import { computed } from 'vue'
import { orderTotal } from '../../utils/tables'
import { useI18n } from '../../i18n'

const props = defineProps({
  sections: { type: Array, required: true },
  activeSection: { type: [String, Number], required: true },
  openTables: { type: Object, required: true },
})
const emit = defineEmits(['open', 'open-double-picker'])
const { t } = useI18n()

const visibleSections = computed(() =>
  props.activeSection === 'all' ? props.sections : props.sections.filter((s) => s.id === props.activeSection),
)

function doubleInfo(tbl) {
  const slotNames = tbl.slots || ['A', 'B']
  const wholeOrder = props.openTables[tbl.id]
  const s0Order = props.openTables[`${tbl.id}_0`]
  const s1Order = props.openTables[`${tbl.id}_1`]
  return {
    anyOpen: !!(wholeOrder || s0Order || s1Order),
    lines: wholeOrder
      ? [`${t('tables.whole')} · €${orderTotal(wholeOrder.items).toFixed(2)}`]
      : [
          `${slotNames[0]}: ${s0Order ? '€' + orderTotal(s0Order.items).toFixed(2) : t('tables.free')}`,
          `${slotNames[1]}: ${s1Order ? '€' + orderTotal(s1Order.items).toFixed(2) : t('tables.free')}`,
        ],
  }
}

function singleInfo(tbl) {
  const order = props.openTables[tbl.id]
  return {
    isOpen: !!order,
    lines: order
      ? [`€${orderTotal(order.items).toFixed(2)}`, `${order.items.length}${t('tables.items_suffix')}`]
      : [t('tables.free')],
  }
}

// Fixed white text — see TableGrid.vue's statusColors() for why.
function statusColors(isOpen) {
  return isOpen
    ? { background: 'var(--color-danger-bg)', color: '#F5F5F5' }
    : { background: 'var(--color-success-bg)', color: '#F5F5F5' }
}
</script>

<template>
  <div class="table-grid">
    <template v-for="sec in visibleSections" :key="sec.id">
      <div v-if="activeSection === 'all'" class="section-label">{{ sec.name }}</div>
      <template v-for="tbl in sec.tables" :key="tbl.id">
        <button
          v-if="tbl.type === 'double'"
          class="tmesa"
          :style="statusColors(doubleInfo(tbl).anyOpen)"
          @click="emit('open-double-picker', tbl)"
        >
          <span class="tid">{{ tbl.label }}</span>
          <div class="tslots"><span v-for="(line, i) in doubleInfo(tbl).lines" :key="i" class="tslot">{{ line }}</span></div>
        </button>
        <button
          v-else
          class="tmesa"
          :style="statusColors(singleInfo(tbl).isOpen)"
          @click="emit('open', tbl.id, null)"
        >
          <span class="tid">{{ tbl.label }}</span>
          <div class="tslots"><span v-for="(line, i) in singleInfo(tbl).lines" :key="i" class="tslot">{{ line }}</span></div>
        </button>
      </template>
    </template>
  </div>
</template>
