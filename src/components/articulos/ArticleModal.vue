<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  open: { type: Boolean, required: true },
  // [{ name, subcategories: [string] }]
  categories: { type: Array, required: true },
  editing: { type: Object, default: null },
  // The category/subcategory the user was browsing when they hit "+ New" —
  // preselected instead of always defaulting to categories[0].
  defaultCategory: { type: String, default: null },
  defaultSubcategory: { type: String, default: null },
})
const emit = defineEmits(['close', 'save'])
const { t } = useI18n()

const name = ref('')
const cat = ref('')
const subcat = ref('')
const price = ref('')
const variants = ref([])
const newVariantName = ref('')

const subcategoriesForCat = computed(() => props.categories.find((c) => c.name === cat.value)?.subcategories || [])

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = props.editing?.name || ''
    // Default to the first real category, never '' — an empty default that
    // matches no <option> leaves the model out of sync with what the
    // browser visually shows as selected (see gotchas.md #2).
    cat.value = props.editing?.cat || props.defaultCategory || props.categories[0]?.name || ''
    subcat.value = props.editing?.subcat || props.defaultSubcategory || ''
    price.value = props.editing ? props.editing.price : ''
    variants.value = props.editing?.variants ? [...props.editing.variants] : []
    newVariantName.value = ''
  },
)

function addVariant() {
  const v = newVariantName.value.trim()
  if (!v || variants.value.includes(v)) return
  variants.value.push(v)
  newVariantName.value = ''
}

function removeVariant(index) {
  variants.value.splice(index, 1)
}

// A category switch invalidates whatever subcategory was selected for the
// old one — same "never leave the model pointing at an option that isn't
// there" rule as the category default above.
watch(cat, () => {
  if (!subcategoriesForCat.value.includes(subcat.value)) subcat.value = ''
})

function handleSave() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('save', {
    id: props.editing?.id || null,
    name: trimmed,
    cat: cat.value,
    subcat: subcat.value || null,
    price: parseFloat(price.value) || 0,
    variants: [...variants.value],
  })
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 340px">
      <h2>{{ t(editing ? 'articles.edit_title' : 'articles.new_title') }}</h2>
      <label>{{ t('art_modal.name_label') }}</label>
      <input v-model="name" type="text" :placeholder="t('art_modal.name_ph')">
      <label>{{ t('art_modal.category_label') }}</label>
      <select v-model="cat">
        <option v-for="c in categories" :key="c.name" :value="c.name">{{ c.name }}</option>
      </select>
      <template v-if="subcategoriesForCat.length">
        <label>{{ t('art_modal.subcategory_label') }}</label>
        <select v-model="subcat">
          <option value="">{{ t('art_modal.subcategory_none') }}</option>
          <option v-for="s in subcategoriesForCat" :key="s" :value="s">{{ s }}</option>
        </select>
      </template>
      <label>{{ t('art_modal.price_label') }}</label>
      <input v-model="price" type="number" placeholder="0.00" min="0" step="0.01">

      <label>{{ t('art_modal.variants_label') }}</label>
      <div class="modal-sub" style="margin-top: -4px">{{ t('art_modal.variants_hint') }}</div>
      <div v-if="variants.length" style="display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0">
        <span v-for="(v, i) in variants" :key="v" class="pill" style="display: flex; align-items: center; gap: 6px; cursor: default">
          {{ v }}
          <button class="variant-del-btn" @click="removeVariant(i)">✕</button>
        </span>
      </div>
      <div style="display: flex; gap: 8px">
        <input v-model="newVariantName" type="text" :placeholder="t('art_modal.variant_ph')" style="flex: 1" @keydown.enter.prevent="addVariant">
        <button class="btn-cancel" @click="addVariant">{{ t('modal.add') }}</button>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
        <button class="btn-save" @click="handleSave">{{ t('modal.save') }}</button>
      </div>
    </div>
  </div>
</template>
