import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { loadState, saveState } from '../services/puroApi'
import { getOrderKey } from '../utils/tables'

const SAVE_DEBOUNCE_MS = 800
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000

// Default/demo data — used as fallback when the cloud blob doesn't have a
// field yet (first run), same semantics as the legacy core.js seed values.
function defaultSections() {
  return [
    { id: 1, name: 'Interior', tables: [
      { id: 101, label: '1' }, { id: 102, label: '2' }, { id: 103, label: '4' },
      { id: 104, label: '5' }, { id: 105, label: '6' }, { id: 106, label: '7' },
      { id: 107, label: '8' }, { id: 108, label: '9' }, { id: 109, label: '10' },
      { id: 110, label: '11' }, { id: 111, label: '12' },
    ] },
    { id: 2, name: 'Terraza', tables: [
      { id: 201, label: 'T1' }, { id: 202, label: 'T2' }, { id: 203, label: 'T3' },
      { id: 204, label: 'T4' }, { id: 205, label: 'T5' },
    ] },
    { id: 3, name: 'Barra', tables: [
      { id: 301, label: 'B1' }, { id: 302, label: 'B2' }, { id: 303, label: 'B3' },
    ] },
  ]
}

function defaultCategories() {
  return ['Comida', 'Bebida', 'Softdrink', 'Café', 'Postre', 'Vino', 'Cerveza', 'Otro']
}

function defaultReservations() {
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return [
    { id: 1, name: 'García Familia', guests: 4, date: todayIso, from: '13:30', to: '15:30', table: 101, notes: 'Cumpleaños', status: 'confirmed' },
    { id: 2, name: 'Müller, Hans', guests: 2, date: todayIso, from: '20:00', to: '21:30', table: 101, notes: '', status: 'confirmed' },
    { id: 3, name: 'Fernández, Ana', guests: 6, date: todayIso, from: '19:30', to: '22:00', table: 104, notes: 'Sin gluten', status: 'pending' },
  ]
}

function defaultArticulos() {
  return [
    { id: 1, name: 'Patatas bravas', cat: 'Comida', price: 4.5 },
    { id: 2, name: 'Jamón ibérico', cat: 'Comida', price: 9.0 },
    { id: 3, name: 'Cerveza Estrella', cat: 'Cerveza', price: 3.5 },
    { id: 4, name: 'Agua mineral', cat: 'Softdrink', price: 2.0 },
    { id: 5, name: 'Café solo', cat: 'Café', price: 1.8 },
    { id: 6, name: 'Rioja Crianza', cat: 'Vino', price: 5.5 },
  ]
}

// This store matches the backend's actual persistence unit — one JSON blob,
// one GET/POST — rather than one Pinia store per domain. See
// docs/app-development/01-frontend-vue/stack-and-structure.md.
export const usePuroStore = defineStore('puro', () => {
  const sections = ref(defaultSections())
  const reservations = ref(defaultReservations())
  const categories = ref(defaultCategories())
  const articulos = ref(defaultArticulos())
  const openTables = reactive({})
  const planData = reactive({})
  const restaurantHours = ref({ open: '12:00', close: '23:00' })

  // In-memory only, intentionally never persisted to the cloud blob —
  // matches the legacy "known limitation," not a bug to fix.
  const history24 = ref([])

  const syncStatus = ref('loading')
  let saveTimer = null
  let purgeTimer = null

  function snapshot() {
    return {
      sections: sections.value,
      reservations: reservations.value,
      categories: categories.value,
      articulos: articulos.value,
      planData: { ...planData },
      openTables: { ...openTables },
      restaurantHours: restaurantHours.value,
    }
  }

  function persist() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      syncStatus.value = 'saving'
      try {
        await saveState(snapshot())
        syncStatus.value = 'saved'
      } catch {
        syncStatus.value = 'offline'
      }
    }, SAVE_DEBOUNCE_MS)
  }

  async function load() {
    syncStatus.value = 'loading'
    try {
      const d = await loadState()
      if (d.sections && d.sections.length) sections.value = d.sections
      if (d.reservations) reservations.value = d.reservations
      if (d.categories && d.categories.length) categories.value = d.categories
      if (d.articulos && d.articulos.length) articulos.value = d.articulos
      if (d.planData) Object.assign(planData, d.planData)
      if (d.openTables) Object.assign(openTables, d.openTables)
      if (d.restaurantHours) restaurantHours.value = d.restaurantHours
      syncStatus.value = 'synced'
    } catch {
      syncStatus.value = 'offline'
    }
    clearInterval(purgeTimer)
    purgeTimer = setInterval(purgeHistory, 60000)
  }

  // --- Reservations ---

  function addReservation(data) {
    reservations.value.push({ id: Date.now(), status: 'confirmed', ...data })
    persist()
  }

  function toggleResStatus(id) {
    const r = reservations.value.find((x) => x.id === id)
    if (r) r.status = r.status === 'confirmed' ? 'pending' : 'confirmed'
    persist()
  }

  function deleteReservation(id) {
    reservations.value = reservations.value.filter((x) => x.id !== id)
    persist()
  }

  // --- Table settings (sections/tables/hours) ---

  function saveTableSettings(newSections, hours) {
    sections.value = newSections
    if (hours.open) restaurantHours.value.open = hours.open
    if (hours.close) restaurantHours.value.close = hours.close
    persist()
  }

  // --- Categories & articulos ---

  function addCategory(name) {
    if (!name || categories.value.includes(name)) return
    categories.value.push(name)
  }

  function deleteCategory(index) {
    categories.value.splice(index, 1)
  }

  function commitCategories() {
    persist()
  }

  function saveArticulo({ id, name, cat, price }) {
    if (id) {
      const a = articulos.value.find((x) => x.id === id)
      if (a) Object.assign(a, { name, cat, price })
    } else {
      articulos.value.push({ id: Date.now(), name, cat, price })
    }
    persist()
  }

  function deleteArticulo(id) {
    articulos.value = articulos.value.filter((a) => a.id !== id)
    persist()
  }

  // --- Orders / open tables ---

  function confirmAddToOrder(tableId, slot, pendingItems) {
    if (!pendingItems.length) return
    const key = getOrderKey(tableId, slot)
    if (!openTables[key]) openTables[key] = { items: [], openedAt: Date.now() }
    const order = openTables[key]
    pendingItems.forEach((p) => {
      const ex = order.items.find((i) => i.id === p.id)
      if (ex) ex.qty += p.qty
      else order.items.push({ id: p.id, name: p.name, price: p.price, qty: p.qty })
    })
    persist()
  }

  function changeQty(tableId, slot, artId, delta) {
    const order = openTables[getOrderKey(tableId, slot)]
    if (!order) return
    const it = order.items.find((i) => i.id === artId)
    if (!it) return
    it.qty += delta
    if (it.qty <= 0) order.items = order.items.filter((i) => i.id !== artId)
    persist()
  }

  function discardEmptyOrder(tableId, slot) {
    const key = getOrderKey(tableId, slot)
    const order = openTables[key]
    if (order && order.items.length === 0) delete openTables[key]
  }

  function closeTable(tableId, slot, method, label) {
    const key = getOrderKey(tableId, slot)
    const order = openTables[key]
    if (!order) return
    const total = order.items.reduce((s, i) => s + i.price * i.qty, 0)
    history24.value.push({
      tableLabel: label,
      total,
      method,
      closedAt: Date.now(),
      items: JSON.parse(JSON.stringify(order.items)),
    })
    delete openTables[key]
    persist()
  }

  function purgeHistory() {
    const cutoff = Date.now() - HISTORY_RETENTION_MS
    history24.value = history24.value.filter((h) => h.closedAt > cutoff)
  }

  // --- Plan ---

  function savePlan(entries) {
    Object.keys(planData).forEach((k) => delete planData[k])
    Object.assign(planData, entries)
    persist()
  }

  return {
    sections,
    reservations,
    categories,
    articulos,
    openTables,
    planData,
    restaurantHours,
    history24,
    syncStatus,
    load,
    persist,
    addReservation,
    toggleResStatus,
    deleteReservation,
    saveTableSettings,
    addCategory,
    deleteCategory,
    commitCategories,
    saveArticulo,
    deleteArticulo,
    confirmAddToOrder,
    changeQty,
    discardEmptyOrder,
    closeTable,
    purgeHistory,
    savePlan,
  }
})
