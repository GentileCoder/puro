<script setup>
import { ref, computed, watch } from 'vue'
import { orderTotal } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { formatPrice } from '../../utils/currency'

const props = defineProps({
  title: { type: String, required: true },
  articulos: { type: Array, required: true },
  // [{ name, subcategories }] — drives the group order below, so it matches
  // the order shown in the Items tab instead of whichever category
  // happened to get its first item earliest.
  categories: { type: Array, required: true },
  order: { type: Object, default: null },
  // Non-null (and non-empty) only when this table is currently split: the
  // other bills ("1.0"/"1.1"/"1.2") to switch between without leaving this
  // screen — [{ slot, label, hasItems }].
  splitSiblings: { type: Array, default: null },
  // Which of splitSiblings' `slot` values is the one currently showing.
  activeSplitSlot: { type: String, default: null },
  // True only when viewing the whole table and it isn't already split.
  canStartSplit: { type: Boolean, default: false },
})
const emit = defineEmits(['back', 'discard', 'confirm', 'change-qty', 'pay', 'split', 'switch-split', 'add-bill', 'move-item'])
const { t } = useI18n()

const pendingItems = ref([])
// The articulo currently being asked "which one?" for — e.g. Juice ->
// Apple/Orange/Passion fruit — null means no picker is open.
const variantPickerArt = ref(null)
const splitPromptOpen = ref(false)
const splitCount = ref(2)
// The confirmed ticket line currently being asked "move to which bill?" —
// null means no picker is open.
const movingItem = ref(null)
const discardConfirming = ref(false)
// Same category -> subcategory -> items drill-down as the Items tab
// (ArticulosView.vue), so picking an item to order works identically.
const activeCategory = ref(null)
const activeSubcategory = ref(null)

watch(
  () => props.order,
  () => {
    pendingItems.value = []
    activeCategory.value = null
    activeSubcategory.value = null
    splitPromptOpen.value = false
    splitCount.value = 2
    movingItem.value = null
    discardConfirming.value = false
  },
)

function confirmSplit() {
  const n = Math.max(2, parseInt(splitCount.value, 10) || 2)
  splitPromptOpen.value = false
  emit('split', n)
}

function moveTo(slot) {
  emit('move-item', { itemId: movingItem.value.id, toSlot: slot })
  movingItem.value = null
}

const groupedArticulos = computed(() =>
  props.categories
    .map((c) => ({ cat: c.name, items: props.articulos.filter((a) => a.cat === c.name) }))
    .filter((group) => group.items.length),
)

const activeCategoryObj = computed(() => props.categories.find((c) => c.name === activeCategory.value) || null)
const activeSubcategories = computed(() => activeCategoryObj.value?.subcategories || [])

const unassignedItems = computed(() =>
  activeCategory.value ? props.articulos.filter((a) => a.cat === activeCategory.value && !a.subcat) : [],
)

function subcatCountFor(sub) {
  return props.articulos.filter((a) => a.cat === activeCategory.value && a.subcat === sub).length
}

const itemsInActive = computed(() => {
  if (activeSubcategory.value) {
    return props.articulos.filter((a) => a.cat === activeCategory.value && a.subcat === activeSubcategory.value)
  }
  if (!activeCategory.value || activeSubcategories.value.length) return []
  return props.articulos.filter((a) => a.cat === activeCategory.value)
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

// Items with variants (flavors/options) need the specific one chosen before
// they can be added — everything else keeps today's single-click add.
function addToOrder(art) {
  if (art.variants?.length) {
    variantPickerArt.value = art
    return
  }
  pushPending(art.id, art.name, art.price)
}

function chooseVariant(variant) {
  const art = variantPickerArt.value
  variantPickerArt.value = null
  // A distinct id per flavor so "Juice (Apple)" and "Juice (Orange)" land
  // on separate ticket lines instead of merging into one.
  pushPending(`${art.id}::${variant}`, `${art.name} (${variant})`, art.price)
}

function pushPending(id, name, price) {
  const existing = pendingItems.value.find((i) => i.id === id)
  if (existing) existing.qty++
  else pendingItems.value.push({ id, name, price, qty: 1 })
}

function changePending(artId, delta) {
  const it = pendingItems.value.find((i) => i.id === artId)
  if (!it) return
  it.qty += delta
  if (it.qty <= 0) pendingItems.value = pendingItems.value.filter((i) => i.id !== artId)
}

const displayItems = computed(() => {
  const confirmed = props.order ? props.order.items : []
  const all = JSON.parse(JSON.stringify(confirmed))
  pendingItems.value.forEach((p) => {
    const ex = all.find((i) => i.id === p.id)
    if (ex) ex.qty += p.qty
    else all.push({ id: p.id, name: p.name, price: p.price, qty: p.qty })
  })
  all.forEach((i) => {
    const inPending = pendingItems.value.find((p) => p.id === i.id)
    const inConfirmed = confirmed.find((c) => c.id === i.id)
    if (inPending && !inConfirmed) i.pending = true
  })
  return all
})

function isPending(item) {
  return !!pendingItems.value.find((p) => p.id === item.id) && !(props.order?.items || []).find((c) => c.id === item.id)
}

function handleConfirm() {
  if (!pendingItems.value.length) return
  emit('confirm', pendingItems.value)
  pendingItems.value = []
}

// Moving items between bills or adding a bill already saves immediately
// (those call store actions directly, no staging) — but with nothing in
// the cart, "Add to order" was a silent no-op, which read as "nothing
// saved" even though it had. This button is never a no-op: with nothing
// pending it just confirms you're done and leaves, same as the back arrow,
// but as an explicit, clearly-labeled action instead of a dead click.
function handlePrimaryAction() {
  if (pendingItems.value.length) handleConfirm()
  else emit('back')
}
</script>

<template>
  <div class="order-view active">
    <div class="order-back">
      <h2>{{ title }}</h2>
      <button v-if="canStartSplit" class="order-split-btn" @click="splitPromptOpen = true">✂ {{ t('tables.split_bill') }}</button>
    </div>
    <div v-if="splitSiblings" class="split-siblings">
      <button
        v-for="s in splitSiblings"
        :key="s.slot"
        class="pill"
        :class="{ active: s.slot === activeSplitSlot }"
        @click="emit('switch-split', s.slot)"
      >
        {{ s.label }}<span v-if="s.hasItems"> •</span>
      </button>
      <button class="pill split-add-bill-pill" @click="emit('add-bill')">{{ t('tables.add_bill') }}</button>
    </div>
    <div class="order-layout">
      <div class="order-cats">
        <template v-if="!activeCategory">
          <div class="art-cat-grid">
            <button v-for="group in groupedArticulos" :key="group.cat" class="art-cat-card" @click="openCategory(group.cat)">
              <span class="art-cat-name">{{ group.cat }}</span>
              <span class="art-cat-count">{{ group.items.length }}</span>
            </button>
          </div>
        </template>

        <template v-else-if="activeSubcategories.length && !activeSubcategory">
          <button class="btn-secondary order-cats-back" @click="backToCategories">← {{ t('articles.back') }}</button>
          <div class="art-group-label">{{ activeCategory }}</div>
          <div class="art-cat-grid" style="margin-bottom: 10px">
            <button v-for="s in activeSubcategories" :key="s" class="art-cat-card" @click="openSubcategory(s)">
              <span class="art-cat-name">{{ s }}</span>
              <span class="art-cat-count">{{ subcatCountFor(s) }}</span>
            </button>
          </div>
          <div v-for="a in unassignedItems" :key="a.id" class="art-item" @click="addToOrder(a)">
            <span class="art-item-name">{{ a.name }}<span v-if="a.variants?.length" class="art-item-variant-hint"> ›</span></span>
            <span class="art-item-price">{{ formatPrice(a.price) }}</span>
          </div>
        </template>

        <template v-else>
          <button class="btn-secondary order-cats-back" @click="activeSubcategory ? backToSubcategories() : backToCategories()">
            ← {{ activeSubcategory ? activeCategory : t('articles.back') }}
          </button>
          <div class="art-group-label">{{ activeSubcategory || activeCategory }}</div>
          <div v-for="a in itemsInActive" :key="a.id" class="art-item" @click="addToOrder(a)">
            <span class="art-item-name">{{ a.name }}<span v-if="a.variants?.length" class="art-item-variant-hint"> ›</span></span>
            <span class="art-item-price">{{ formatPrice(a.price) }}</span>
          </div>
        </template>
      </div>
      <div class="order-ticket">
        <div class="ticket-header">{{ t('tables.order') }}</div>
        <div class="ticket-items">
          <div v-if="!displayItems.length" style="padding: 20px; text-align: center; color: #555; font-size: 13px">{{ t('tables.no_items') }}</div>
          <div v-for="it in displayItems" :key="it.id" class="ticket-row" :style="isPending(it) ? 'opacity:0.55' : ''">
            <span class="trow-name">{{ it.name }}<span v-if="isPending(it)" style="font-size: 10px; color: #e8c67c"> {{ t('tables.pending') }}</span></span>
            <div class="trow-qty">
              <button class="qty-btn" @click="isPending(it) ? changePending(it.id, -1) : emit('change-qty', it.id, -1)">−</button>
              <span style="font-size: 13px; min-width: 16px; text-align: center">{{ it.qty }}</span>
              <button class="qty-btn" @click="isPending(it) ? changePending(it.id, 1) : emit('change-qty', it.id, 1)">+</button>
            </div>
            <span class="trow-price">{{ formatPrice(it.price * it.qty) }}</span>
            <button v-if="splitSiblings && !isPending(it)" class="trow-move-btn" :title="t('tables.move_item')" @click="movingItem = it">⇄</button>
          </div>
        </div>
        <div class="ticket-footer">
          <div class="ticket-total"><span>{{ t('tables.total') }}</span><span>{{ formatPrice(orderTotal(displayItems)) }}</span></div>
          <button class="btn-primary" style="width: 100%; font-size: 14px; padding: 11px; margin-bottom: 8px" @click="handlePrimaryAction">{{ pendingItems.length ? t('tables.add_to_order') : t('tables.done') }}</button>
          <button class="btn-green" style="width: 100%; font-size: 14px; padding: 11px; margin-bottom: 8px" @click="emit('pay')">{{ t('tables.charge') }}</button>
          <div v-if="discardConfirming" style="display: flex; gap: 8px">
            <button class="btn-cancel" style="flex: 1; font-size: 13px; padding: 9px" @click="discardConfirming = false">{{ t('modal.cancel') }}</button>
            <button class="order-discard-confirm-btn" style="flex: 1" @click="emit('discard')">{{ t('tables.discard_confirm') }}</button>
          </div>
          <button v-else class="order-discard-btn" @click="discardConfirming = true">{{ t('tables.discard') }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: !!variantPickerArt }">
      <div class="modal" style="width: 300px">
        <h2>{{ variantPickerArt?.name }}</h2>
        <div class="modal-sub">{{ t('tables.choose_variant') }}</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin: 12px 0">
          <button v-for="v in variantPickerArt?.variants || []" :key="v" class="btn-secondary" style="width: 100%; text-align: left; padding: 10px 14px" @click="chooseVariant(v)">{{ v }}</button>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="variantPickerArt = null">{{ t('modal.cancel') }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: splitPromptOpen }">
      <div class="modal" style="width: 280px">
        <h2>{{ t('tables.split_bill') }}</h2>
        <div class="modal-sub">{{ t('tables.split_prompt') }}</div>
        <input v-model="splitCount" type="number" min="2" max="12" @keydown.enter="confirmSplit">
        <div class="modal-actions">
          <button class="btn-cancel" @click="splitPromptOpen = false">{{ t('modal.cancel') }}</button>
          <button class="btn-save" @click="confirmSplit">{{ t('modal.save') }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: !!movingItem }">
      <div class="modal" style="width: 280px">
        <h2>{{ movingItem?.name }}</h2>
        <div class="modal-sub">{{ t('tables.move_to') }}</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin: 12px 0">
          <button
            v-for="s in (splitSiblings || []).filter((x) => x.slot !== activeSplitSlot)"
            :key="s.slot"
            class="btn-secondary"
            style="width: 100%; text-align: left; padding: 10px 14px"
            @click="moveTo(s.slot)"
          >{{ s.label }}</button>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="movingItem = null">{{ t('modal.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-back { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.order-back h2 { font-size: 17px; font-weight: 600; flex: 1; }
.order-split-btn { font-size: 12px; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-primary); background: transparent; color: var(--color-primary-hover); cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); }
.order-split-btn:hover { background: var(--color-primary); color: var(--color-primary-text); }
.split-siblings { display: flex; flex-wrap: wrap; gap: 6px; margin: -6px 0 14px; }
.split-add-bill-pill { border-style: dashed; }
.order-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.order-cats { display: flex; flex-direction: column; gap: 6px; }
.order-cats-back { margin-bottom: 4px; align-self: flex-start; }
.art-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: 5px; cursor: pointer; }
.art-item:hover { border-color: var(--color-primary); }
.art-item-name { font-size: 13px; }
.art-item-variant-hint { color: var(--color-text-muted); }
.art-item-price { font-size: 12px; color: var(--color-success-fg); font-weight: 600; }
.order-ticket { background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border); display: flex; flex-direction: column; max-height: 70vh; }
.ticket-header { padding: 12px 14px; background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); font-size: 13px; font-weight: 600; }
.ticket-items { flex: 1; overflow-y: auto; padding: 8px 0; }
.ticket-row { display: flex; align-items: center; gap: 8px; padding: 7px 12px; }
.ticket-row:hover { background: var(--color-surface-raised); }
.trow-name { flex: 1; font-size: 13px; }
.trow-qty { display: flex; align-items: center; gap: 6px; }
.qty-btn { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.trow-price { font-size: 13px; font-weight: 600; color: var(--color-success-fg); min-width: 44px; text-align: right; }
.trow-move-btn { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); border-radius: 6px; width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
.trow-move-btn:hover { border-color: var(--color-primary); color: var(--color-text); }
.ticket-footer { padding: 12px 14px; border-top: 1px solid var(--color-border); }
.ticket-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.order-discard-btn { width: 100%; font-size: 12px; padding: 7px; border-radius: var(--radius-md); border: 1px solid var(--color-danger-fg); background: transparent; color: var(--color-danger-fg); cursor: pointer; }
.order-discard-btn:hover { background: var(--color-danger-bg); }
.order-discard-confirm-btn { font-size: 13px; padding: 9px; border-radius: var(--radius-md); border: none; background: var(--color-danger-bg); color: var(--color-danger-fg); cursor: pointer; }
</style>
