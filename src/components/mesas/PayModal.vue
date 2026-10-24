<script setup>
import { useI18n } from '../../i18n'
import { formatPrice } from '../../utils/currency'

defineProps({
  open: { type: Boolean, required: true },
  total: { type: Number, required: true },
  subtitle: { type: String, required: true },
})
const emit = defineEmits(['close', 'pay'])
const { t } = useI18n()
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 320px; text-align: center">
      <h2>{{ t('payment_modal.title') }}</h2>
      <div class="modal-sub">{{ subtitle }}</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--color-success-fg); margin: 12px 0">{{ formatPrice(total) }}</div>
      <div class="pay-btns">
        <button class="pay-btn pay-ec" @click="emit('pay', 'EC')">{{ t('payment_modal.card') }}</button>
        <button class="pay-btn pay-bar" @click="emit('pay', 'Bar')">{{ t('payment_modal.cash') }}</button>
      </div>
      <div class="modal-actions" style="justify-content: center">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
      </div>
    </div>
  </div>
</template>
