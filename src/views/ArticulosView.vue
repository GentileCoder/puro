<script setup>
import { ref, computed } from 'vue'
import { usePuroStore } from '../stores/puro'
import { useI18n } from '../i18n'
import CategoryModal from '../components/articulos/CategoryModal.vue'
import ArticleModal from '../components/articulos/ArticleModal.vue'

const puro = usePuroStore()
const { t } = useI18n()

const catFilter = ref('')
const catModalOpen = ref(false)
const artModalOpen = ref(false)
const editingArt = ref(null)

const filtered = computed(() => (catFilter.value ? puro.articulos.filter((a) => a.cat === catFilter.value) : puro.articulos))

const grouped = computed(() => {
  const groups = {}
  const order = []
  filtered.value.forEach((a) => {
    if (!groups[a.cat]) { groups[a.cat] = []; order.push(a.cat) }
    groups[a.cat].push(a)
  })
  return order.map((cat) => ({ cat, items: groups[cat] }))
})

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
  puro.deleteCategory(index)
}

function handleCloseCatModal() {
  catModalOpen.value = false
  puro.commitCategories()
}
</script>

<template>
  <div class="content active">
    <div class="toolbar">
      <select v-model="catFilter">
        <option value="">{{ t('articles.all_categories') }}</option>
        <option v-for="c in puro.categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="btn-secondary" @click="catModalOpen = true">{{ t('articles.categories_btn') }}</button>
      <button class="btn-primary" @click="openArtModal(null)">{{ t('articles.new') }}</button>
    </div>

    <p v-if="!filtered.length" style="color: #666; font-size: 13px; text-align: center; padding: 30px">{{ t('articles.empty') }}</p>
    <div v-for="group in grouped" :key="group.cat" style="margin-bottom: 16px">
      <div class="art-group-label">{{ group.cat }}</div>
      <div v-for="a in group.items" :key="a.id" class="art-row">
        <span style="font-size: 13px">{{ a.name }}</span>
        <div style="display: flex; align-items: center; gap: 10px">
          <span style="font-size: 14px; font-weight: 600; color: var(--color-success-fg)">€{{ a.price.toFixed(2) }}</span>
          <button class="res-act-btn" @click="openArtModal(a)">✎</button>
          <button class="res-act-btn del" @click="puro.deleteArticulo(a.id)">✕</button>
        </div>
      </div>
    </div>

    <CategoryModal
      :open="catModalOpen"
      :categories="puro.categories"
      @close="handleCloseCatModal"
      @add="handleAddCategory"
      @delete="handleDeleteCategory"
    />
    <ArticleModal
      :open="artModalOpen"
      :categories="puro.categories"
      :editing="editingArt"
      @close="artModalOpen = false"
      @save="handleSaveArticulo"
    />
  </div>
</template>
