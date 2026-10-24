<script setup>
import { ref } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  // [{ name, subcategories: [string] }]
  categories: { type: Array, required: true },
})
const emit = defineEmits(['close', 'add', 'delete', 'add-sub', 'delete-sub'])
const { t } = useI18n()

const newCatName = ref('')
const newSubName = ref('')
// Only one category's subcategory list is expanded at a time — index into
// props.categories, or null when none is.
const expandedIndex = ref(null)

function handleAdd() {
  const name = newCatName.value.trim()
  if (!name) return
  emit('add', name)
  newCatName.value = ''
}

function toggleExpand(i) {
  expandedIndex.value = expandedIndex.value === i ? null : i
  newSubName.value = ''
}

function handleAddSub(catIndex) {
  const name = newSubName.value.trim()
  if (!name) return
  emit('add-sub', catIndex, name)
  newSubName.value = ''
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 360px">
      <h2>{{ t('cat_modal.title') }}</h2>
      <div class="modal-sub">{{ t('cat_modal.subtitle') }}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; margin: 12px 0; max-height: 320px; overflow-y: auto">
        <div v-for="(c, i) in categories" :key="c.name">
          <div class="cat-row">
            <button class="cat-expand-btn" @click="toggleExpand(i)">{{ expandedIndex === i ? '▾' : '▸' }}</button>
            <span style="flex: 1; font-size: 13px">{{ c.name }}</span>
            <span v-if="c.subcategories.length" class="art-cat-count">{{ c.subcategories.length }}</span>
            <button class="res-act-btn del" @click="emit('delete', i)">✕</button>
          </div>
          <div v-if="expandedIndex === i" class="cat-sub-panel">
            <div v-for="(s, si) in c.subcategories" :key="s" class="cat-row" style="padding-left: 8px">
              <span style="flex: 1; font-size: 12px; color: var(--color-text-muted)">{{ s }}</span>
              <button class="res-act-btn del" @click="emit('delete-sub', i, si)">✕</button>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 4px">
              <input v-model="newSubName" type="text" :placeholder="t('cat_modal.new_sub_ph')" style="flex: 1" @keydown.enter="handleAddSub(i)">
              <button class="btn-save" @click="handleAddSub(i)">{{ t('modal.add') }}</button>
            </div>
          </div>
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
