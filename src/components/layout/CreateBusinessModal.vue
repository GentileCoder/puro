<script setup>
import { ref, watch } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useI18n } from '../../i18n'

const props = defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close'])
const business = useBusinessStore()
const { t } = useI18n()

const name = ref('')
const error = ref('')
const saving = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = ''
    error.value = ''
  },
)

async function handleCreate() {
  if (!name.value.trim()) {
    error.value = t('business.name_required')
    return
  }
  error.value = ''
  saving.value = true
  try {
    await business.createBusiness(name.value.trim())
    emit('close')
  } catch {
    error.value = t('business.error_create')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 320px">
      <h2>{{ t('business.new') }}</h2>
      <label>{{ t('business.name_label') }}</label>
      <input v-model="name" type="text" :placeholder="t('business.name_ph')" @keydown.enter="handleCreate">
      <div style="font-size: 12px; color: var(--color-danger-fg); min-height: 16px; margin-top: 8px">{{ error }}</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
        <button class="btn-save" :disabled="saving" @click="handleCreate">{{ t('modal.create') }}</button>
      </div>
    </div>
  </div>
</template>
