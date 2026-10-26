<script setup>
import { computed } from 'vue'
import { getOrderKey, orderTotal } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { formatPrice } from '../../utils/currency'

const props = defineProps({
  open: { type: Boolean, required: true },
  table: { type: Object, default: null },
  openTables: { type: Object, required: true },
  count: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'pick', 'add-bill'])
const { t } = useI18n()

// Each bill is "<table label>.<index>" — e.g. table "1" split 3 ways is
// "1.0"/"1.1"/"1.2" — keyed with getOrderKey's string-slot form.
const options = computed(() => {
  if (!props.table) return []
  return Array.from({ length: props.count }, (_, i) => {
    const slot = String(i)
    const key = getOrderKey(props.table.id, slot)
    return { slot, label: `${props.table.label}.${i}`, order: props.openTables[key] }
  })
})
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="max-width: 300px">
      <h2>{{ table ? `${t('tables.table')} ${table.label}` : '' }}</h2>
      <div class="modal-sub">{{ t('tables.split_bill') }}</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px">
        <button
          v-for="o in options"
          :key="o.slot"
          class="btn-secondary"
          style="width: 100%; text-align: left; padding: 10px 14px"
          @click="emit('pick', o.slot)"
        >
          <strong>{{ o.label }}</strong>
          <template v-if="o.order"> · {{ formatPrice(orderTotal(o.order.items)) }} / {{ o.order.items.length }}{{ t('tables.items_suffix') }}</template>
          <span v-else style="font-size: 11px; color: #6b7280"> {{ t('tables.free') }}</span>
        </button>
        <button class="btn-secondary" style="width: 100%; text-align: center; border-style: dashed" @click="emit('add-bill')">{{ t('tables.add_bill') }}</button>
      </div>
      <div class="modal-actions" style="margin-top: 14px">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
      </div>
    </div>
  </div>
</template>
