<script setup>
import { computed } from 'vue'
import { getOrderKey, orderTotal } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { formatPrice } from '../../utils/currency'

const props = defineProps({
  open: { type: Boolean, required: true },
  table: { type: Object, default: null },
  openTables: { type: Object, required: true },
})
const emit = defineEmits(['close', 'pick'])
const { t } = useI18n()

const options = computed(() => {
  if (!props.table) return []
  const slotNames = props.table.slots || ['A', 'B']
  return [
    { slot: null, label: t('tables.whole'), key: getOrderKey(props.table.id, null) },
    { slot: 0, label: slotNames[0], key: getOrderKey(props.table.id, 0) },
    { slot: 1, label: slotNames[1], key: getOrderKey(props.table.id, 1) },
  ].map((o) => ({ ...o, order: props.openTables[o.key] }))
})
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="max-width: 300px">
      <h2>{{ table ? `${t('tables.table')} ${table.label}` : '' }}</h2>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px">
        <button
          v-for="o in options"
          :key="o.slot ?? 'whole'"
          class="btn-secondary"
          style="width: 100%; text-align: left; padding: 10px 14px"
          @click="emit('pick', o.slot)"
        >
          <strong>{{ o.label }}</strong>
          <template v-if="o.order"> · {{ formatPrice(orderTotal(o.order.items)) }} / {{ o.order.items.length }}{{ t('tables.items_suffix') }}</template>
          <span v-else style="font-size: 11px; color: #6b7280"> {{ t('tables.free') }}</span>
        </button>
      </div>
      <div class="modal-actions" style="margin-top: 14px">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
      </div>
    </div>
  </div>
</template>
