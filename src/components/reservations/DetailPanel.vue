<script setup>
import { useI18n } from '../../i18n'

const props = defineProps({
  table: { type: Object, required: true },
  section: { type: Object, default: null },
  reservations: { type: Array, required: true },
})
const emit = defineEmits(['add', 'toggle', 'delete', 'close'])
const { t } = useI18n()
</script>

<template>
  <div class="detail-panel">
    <div class="detail-header">
      <h3>
        {{ t('tables.table') }} {{ table.label }}<template v-if="section"> · {{ section.name }}</template>
        — {{ reservations.length }} {{ t(reservations.length !== 1 ? 'reservations.plural' : 'reservations.singular') }}
      </h3>
      <div style="display: flex; gap: 8px">
        <button class="btn-primary" style="font-size: 12px; padding: 5px 12px" @click="emit('add')">{{ t('reservations.add') }}</button>
        <button style="background: transparent; border: none; color: #aaa; font-size: 20px; cursor: pointer" @click="emit('close')">✕</button>
      </div>
    </div>
    <div class="res-list">
      <div v-if="!reservations.length" style="padding: 20px; text-align: center; color: #666; font-size: 13px">
        {{ t('reservations.none') }}
      </div>
      <div v-for="r in reservations" :key="r.id" class="res-row">
        <div>
          <h4 style="font-size: 13px; font-weight: 600">
            {{ r.name }} · {{ r.guests }} {{ t('reservations.pax') }} · {{ r.openEnd ? `${r.from} →` : `${r.from}–${r.to}` }}
          </h4>
          <p style="font-size: 11px; color: #aaa; margin-top: 2px">{{ r.notes || t('reservations.no_details') }}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 6px">
          <span class="res-badge" :class="r.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending'">
            {{ t(r.status === 'confirmed' ? 'reservations.confirmed' : 'reservations.pending') }}
          </span>
          <button class="res-act-btn" @click="emit('toggle', r.id)">{{ r.status === 'confirmed' ? '⟳' : '✓' }}</button>
          <button class="res-act-btn del" @click="emit('delete', r.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>
