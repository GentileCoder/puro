<script setup>
import { ref, computed, watch } from 'vue'
import { orderTotal } from '../../utils/tables'
import { useI18n } from '../../i18n'
import { formatPrice } from '../../utils/currency'

const props = defineProps({
  title: { type: String, required: true },
  articulos: { type: Array, required: true },
  order: { type: Object, default: null },
})
const emit = defineEmits(['back', 'confirm', 'change-qty', 'pay'])
const { t } = useI18n()

const pendingItems = ref([])

watch(
  () => props.order,
  () => { pendingItems.value = [] },
)

const groupedArticulos = computed(() => {
  const grouped = {}
  const order = []
  props.articulos.forEach((a) => {
    if (!grouped[a.cat]) { grouped[a.cat] = []; order.push(a.cat) }
    grouped[a.cat].push(a)
  })
  return order.map((cat) => ({ cat, items: grouped[cat] }))
})

function addToOrder(art) {
  const existing = pendingItems.value.find((i) => i.id === art.id)
  if (existing) existing.qty++
  else pendingItems.value.push({ id: art.id, name: art.name, price: art.price, qty: 1 })
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
</script>

<template>
  <div class="order-view active">
    <div class="order-back">
      <button @click="emit('back')">←</button>
      <h2>{{ title }}</h2>
    </div>
    <div class="order-layout">
      <div class="order-cats">
        <div v-for="group in groupedArticulos" :key="group.cat" class="cat-section">
          <div class="cat-header">{{ group.cat }}</div>
          <div v-for="a in group.items" :key="a.id" class="art-item" @click="addToOrder(a)">
            <span class="art-item-name">{{ a.name }}</span>
            <span class="art-item-price">{{ formatPrice(a.price) }}</span>
          </div>
        </div>
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
          </div>
        </div>
        <div class="ticket-footer">
          <div class="ticket-total"><span>{{ t('tables.total') }}</span><span>{{ formatPrice(orderTotal(displayItems)) }}</span></div>
          <button class="btn-primary" style="width: 100%; font-size: 14px; padding: 11px; margin-bottom: 8px" @click="handleConfirm">{{ t('tables.add_to_order') }}</button>
          <button class="btn-green" style="width: 100%; font-size: 14px; padding: 11px" @click="emit('pay')">{{ t('tables.charge') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-back { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.order-back button { background: transparent; border: none; color: var(--color-text-muted); font-size: 22px; cursor: pointer; line-height: 1; }
.order-back h2 { font-size: 17px; font-weight: 600; }
.order-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.order-cats { display: flex; flex-direction: column; gap: 6px; }
.cat-section { background: var(--color-surface); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-border); }
.cat-header { padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.8px; background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); }
.art-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-bottom: 1px solid var(--color-border); cursor: pointer; }
.art-item:last-child { border-bottom: none; }
.art-item:hover { background: var(--color-surface-raised); }
.art-item-name { font-size: 13px; }
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
.ticket-footer { padding: 12px 14px; border-top: 1px solid var(--color-border); }
.ticket-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; margin-bottom: 12px; }
</style>
