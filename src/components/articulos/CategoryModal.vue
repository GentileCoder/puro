<script setup>
import { ref } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  categories: { type: Array, required: true },
})
const emit = defineEmits(['close', 'add', 'delete'])
const { t } = useI18n()

const newCatName = ref('')

function handleAdd() {
  const name = newCatName.value.trim()
  if (!name) return
  emit('add', name)
  newCatName.value = ''
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 340px">
      <h2>{{ t('cat_modal.title') }}</h2>
      <div class="modal-sub">{{ t('cat_modal.subtitle') }}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; margin: 12px 0; max-height: 260px; overflow-y: auto">
        <div v-for="(c, i) in categories" :key="c" class="cat-row">
          <span style="flex: 1; font-size: 13px">{{ c }}</span>
          <button class="res-act-btn del" @click="emit('delete', i)">✕</button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 4px">
        <input v-model="newCatName" type="text" :placeholder="t('cat_modal.new_ph')" style="flex: 1" @keydown.enter="handleAdd">
        <button class="btn-save" @click="handleAdd">{{ t('modal.add') }}</button>
      </div>
      <div class="modal-actions">
        <button class="btn-save" @click="emit('close')">{{ t('modal.close') }}</button>
      </div>
    </div>
  </div>
</template>
