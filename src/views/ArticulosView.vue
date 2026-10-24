<script setup>
import { ref, computed } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useI18n } from '../i18n'
import CategoryModal from '../components/articulos/CategoryModal.vue'
import ArticleModal from '../components/articulos/ArticleModal.vue'
import { formatPrice } from '../utils/currency'

const puro = usePuroStore()
const { t } = useI18n()

const activeCategory = ref(null)
const activeSubcategory = ref(null)
const catModalOpen = ref(false)
const artModalOpen = ref(false)
const editingArt = ref(null)

function countFor(cat) {
  return puro.articulos.filter((a) => a.cat === cat).length
}

const activeCategoryObj = computed(() => puro.categories.find((c) => c.name === activeCategory.value) || null)
const activeSubcategories = computed(() => activeCategoryObj.value?.subcategories || [])

// Items sitting directly under the category, not in any of its
// subcategories — shown alongside the subcategory cards rather than hidden.
const unassignedItems = computed(() =>
  activeCategory.value ? puro.articulos.filter((a) => a.cat === activeCategory.value && !a.subcat) : [],
)

function subcatCountFor(sub) {
  return puro.articulos.filter((a) => a.cat === activeCategory.value && a.subcat === sub).length
}

// Flat items list for: a category with no subcategories (skip straight to
// items), or a chosen subcategory.
const itemsInActive = computed(() => {
  if (activeSubcategory.value) {
    return puro.articulos.filter((a) => a.cat === activeCategory.value && a.subcat === activeSubcategory.value)
  }
  if (!activeCategory.value || activeSubcategories.value.length) return []
  return puro.articulos.filter((a) => a.cat === activeCategory.value)
})

function openCategory(cat) {
  activeCategory.value = cat
  activeSubcategory.value = null
}

function openSubcategory(sub) {
  activeSubcategory.value = sub
}

function backToCategories() {
  activeCategory.value = null
  activeSubcategory.value = null
}

function backToSubcategories() {
  activeSubcategory.value = null
}

function openArtModal(art = null) {
  editingArt.value = art
  artModalOpen.value = true
}

function handleSaveArticulo(payload) {
  puro.saveArticulo(payload)
  artModalOpen.value = false
}

function handleAddCategory(name) {
  puro.addCategory(name)
}

function handleDeleteCategory(index) {
  const removed = puro.categories[index]
  puro.deleteCategory(index)
  if (activeCategory.value === removed.name) backToCategories()
}

function handleAddSubcategory(catIndex, name) {
  puro.addSubcategory(catIndex, name)
}

function handleDeleteSubcategory(catIndex, subIndex) {
  const removed = puro.categories[catIndex]?.subcategories[subIndex]
  puro.deleteSubcategory(catIndex, subIndex)
  if (activeSubcategory.value === removed) backToSubcategories()
}

function handleCloseCatModal() {
  catModalOpen.value = false
  puro.commitCategories()
}
</script>

<template>
  <div class="content active">
    <template v-if="!activeCategory">
      <div class="toolbar">
        <button class="btn-secondary" @click="catModalOpen = true">{{ t('articles.categories_btn') }}</button>
        <button class="btn-primary" @click="openArtModal(null)">{{ t('articles.new') }}</button>
      </div>

      <p v-if="!puro.categories.length" style="color: #666; font-size: 13px; text-align: center; padding: 30px">{{ t('articles.no_categories') }}</p>
      <div v-else class="art-cat-grid">
        <button v-for="c in puro.categories" :key="c.name" class="art-cat-card" @click="openCategory(c.name)">
          <span class="art-cat-name">{{ c.name }}</span>
          <span class="art-cat-count">{{ countFor(c.name) }}</span>
        </button>
      </div>
    </template>

    <template v-else-if="activeSubcategories.length && !activeSubcategory">
      <div class="toolbar" style="justify-content: space-between">
        <button class="btn-secondary" @click="backToCategories">← {{ t('articles.back') }}</button>
        <button class="btn-primary" @click="openArtModal(null)">{{ t('articles.new') }}</button>
      </div>
      <div class="art-group-label">{{ activeCategory }}</div>
      <div class="art-cat-grid" style="margin-bottom: 16px">
        <button v-for="s in activeSubcategories" :key="s" class="art-cat-card" @click="openSubcategory(s)">
          <span class="art-cat-name">{{ s }}</span>
          <span class="art-cat-count">{{ subcatCountFor(s) }}</span>
        </button>
      </div>
      <template v-if="unassignedItems.length">
        <div v-for="a in unassignedItems" :key="a.id" class="art-row">
          <span style="font-size: 13px">{{ a.name }}</span>
          <div style="display: flex; align-items: center; gap: 10px">
            <span style="font-size: 14px; font-weight: 600; color: var(--color-success-fg)">{{ formatPrice(a.price) }}</span>
            <button class="res-act-btn" @click="openArtModal(a)">✎</button>
            <button class="res-act-btn del" @click="puro.deleteArticulo(a.id)">✕</button>
          </div>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="toolbar" style="justify-content: space-between">
        <button class="btn-secondary" @click="activeSubcategory ? backToSubcategories() : backToCategories()">
          ← {{ activeSubcategory ? activeCategory : t('articles.back') }}
        </button>
        <button class="btn-primary" @click="openArtModal(null)">{{ t('articles.new') }}</button>
      </div>
      <div class="art-group-label">{{ activeSubcategory || activeCategory }}</div>
      <p v-if="!itemsInActive.length" style="color: #666; font-size: 13px; text-align: center; padding: 30px">{{ t('articles.empty') }}</p>
      <div v-for="a in itemsInActive" :key="a.id" class="art-row">
        <span style="font-size: 13px">{{ a.name }}</span>
        <div style="display: flex; align-items: center; gap: 10px">
          <span style="font-size: 14px; font-weight: 600; color: var(--color-success-fg)">{{ formatPrice(a.price) }}</span>
          <button class="res-act-btn" @click="openArtModal(a)">✎</button>
          <button class="res-act-btn del" @click="puro.deleteArticulo(a.id)">✕</button>
        </div>
      </div>
    </template>

    <CategoryModal
      :open="catModalOpen"
      :categories="puro.categories"
      @close="handleCloseCatModal"
      @add="handleAddCategory"
      @delete="handleDeleteCategory"
      @add-sub="handleAddSubcategory"
      @delete-sub="handleDeleteSubcategory"
    />
    <ArticleModal
      :open="artModalOpen"
      :categories="puro.categories"
      :editing="editingArt"
      :default-category="activeCategory"
      :default-subcategory="activeSubcategory"
      @close="artModalOpen = false"
      @save="handleSaveArticulo"
    />
  </div>
</template>
