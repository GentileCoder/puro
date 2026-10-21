import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { loadState, saveState } from '../services/puroApi'
import { getOrderKey } from '../utils/tables'
import { DEFAULT_THEME } from '../theme/themes'

const SAVE_DEBOUNCE_MS = 800
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000

// PURO is multi-tenant: each business starts genuinely empty, not seeded
// with El Toro's own specific sample content (its actual section names,
// named customers, actual menu items) — that made sense when there was
// exactly one restaurant, not now that "create a new business" is a real,
// repeatable action for unrelated restaurants and bars.
function defaultSections() {
  return []
}

// A generic starting template, not any one business's layout — reasonable
// to keep seeding this one.
function defaultCategories() {
  return ['Comida', 'Bebida', 'Softdrink', 'Café', 'Postre', 'Vino', 'Cerveza', 'Otro']
}

function defaultReservations() {
  return []
}

function defaultArticulos() {
  return []
}

// ISO weekday 1=Mon..7=Sun. A generic Tue-Sat, 3-slots-a-day starting
// template — not a specific business's data, reasonable to keep seeding.
function defaultBusiness() {
  return {
    openDays: [2, 3, 4, 5, 6],
    hours: { open: '12:00', close: '23:00' },
    staffing: {
      2: ['fijo', 'springer', 'springer'],
      3: ['fijo', 'springer', 'springer'],
      4: ['fijo', 'springer', 'springer'],
      5: ['fijo', 'fijo', 'springer'],
      6: ['fijo', 'fijo', 'springer'],
    },
    frequency: 'weekly',
    // 'manager': admin/manager types who works each slot (default, today's
    // behavior). 'staff': staff request open slots themselves and
    // admin/manager accepts/declines — see planRequests below.
    planMode: 'manager',
  }
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
  const business = ref(defaultBusiness())
  // planDraft: what admin/manager edit. planPublished: what staff always see.
  // Only lockPlan() copies draft -> published; see stores/puro.js's "Plan"
  // section below for why this replaces the old single planData blob.
  const planDraft = reactive({})
  const planPublished = reactive({})
  const planLocked = ref(true)
  // Staff mode only: pending shift requests on the draft, keyed the same way
  // as planDraft (planKey(date, slot)) -> [{ uid, email }, ...]. See the
  // "Plan requests (Staff mode)" section below.
  const planRequests = reactive({})
  const theme = ref({ ...DEFAULT_THEME })

  // In-memory only, intentionally never persisted to the cloud blob —
  // matches the legacy "known limitation," not a bug to fix.
  const history24 = ref([])

  const syncStatus = ref('loading')
  let saveTimer = null
  let purgeTimer = null
  // Remembered by load() and reused by persist() — every subsequent save
  // from any mutation targets whichever business was most recently loaded,
  // without threading an id through every single action.
  let currentBusinessId = null

  function snapshot() {
    return {
      sections: sections.value,
      reservations: reservations.value,
      categories: categories.value,
      articulos: articulos.value,
      business: business.value,
      planDraft: { ...planDraft },
      planPublished: { ...planPublished },
      planLocked: planLocked.value,
      planRequests: { ...planRequests },
      openTables: { ...openTables },
      theme: theme.value,
    }
  }

  function persist() {
    if (!currentBusinessId) return
    const businessId = currentBusinessId
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      syncStatus.value = 'saving'
      try {
        await saveState(businessId, snapshot())
        syncStatus.value = 'saved'
      } catch {
        syncStatus.value = 'offline'
      }
    }, SAVE_DEBOUNCE_MS)
  }

  // Called whenever the active business is set — on first login, and every
  // time an admin switches businesses. Always resets to defaults first: a
  // merge-only load (like this store's very first version had) would leak
  // the previous business's leftover data into a newly-switched-to one for
  // any field the new blob doesn't happen to define.
  async function load(businessId) {
    currentBusinessId = businessId
    sections.value = defaultSections()
    reservations.value = defaultReservations()
    categories.value = defaultCategories()
    articulos.value = defaultArticulos()
    Object.keys(openTables).forEach((k) => delete openTables[k])
    business.value = defaultBusiness()
    Object.keys(planDraft).forEach((k) => delete planDraft[k])
    Object.keys(planPublished).forEach((k) => delete planPublished[k])
    Object.keys(planRequests).forEach((k) => delete planRequests[k])
    planLocked.value = true
    theme.value = { ...DEFAULT_THEME }
    // In-memory only regardless, but a business switch shouldn't carry the
    // previous business's recent-closures into the new one's view either.
    history24.value = []

    syncStatus.value = 'loading'
    try {
      const d = await loadState(businessId)
      if (d.sections && d.sections.length) sections.value = d.sections
      if (d.reservations) reservations.value = d.reservations
      if (d.categories && d.categories.length) categories.value = d.categories
      if (d.articulos && d.articulos.length) articulos.value = d.articulos
      if (d.openTables) Object.assign(openTables, d.openTables)
      if (d.theme && d.theme.id) theme.value = d.theme
      if (d.business) business.value = d.business
      if (d.planDraft) Object.assign(planDraft, d.planDraft)
      if (d.planPublished) Object.assign(planPublished, d.planPublished)
      if (d.planRequests) Object.assign(planRequests, d.planRequests)
      if (typeof d.planLocked === 'boolean') planLocked.value = d.planLocked
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

  // --- Table settings (sections/tables) ---
  // Hours moved to Business settings below — physical table/section layout
  // and business policy (hours) are different concerns.

  function saveTableSettings(newSections) {
    sections.value = newSections
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

  // --- Theme (admin-only in the UI; shared app-wide via the cloud blob) ---

  function setTheme(id, mode) {
    theme.value = { id, mode }
    persist()
  }

  // --- Business settings (admin/manager; drives the Plan tab's grid) ---

  function saveBusiness(newBusiness) {
    business.value = newBusiness
    persist()
  }

  // --- Plan ---
  // planDraft is mutated directly by the view (same pattern openTables
  // already used) — call persist() after each edit from there. lockPlan()
  // is the only thing that ever touches planPublished, which is what keeps
  // this from reintroducing the old "save wipes other weeks" bug: there's
  // no per-save wipe-and-replace anymore, draft just accumulates, and
  // locking is an explicit "publish everything currently drafted" action.

  function lockPlan() {
    Object.keys(planPublished).forEach((k) => delete planPublished[k])
    Object.assign(planPublished, planDraft)
    planLocked.value = true
    persist()
  }

  function unlockPlan() {
    planLocked.value = false
    persist()
  }

  // --- Plan requests (Staff mode) ---
  // Staff request open draft slots themselves instead of admin/manager typing
  // names in directly; admin/manager then accepts (fills planDraft, same as
  // if they'd typed it) or declines (just removes that one request) from the
  // pending list. Manager-mode businesses never touch this.

  function requestSlot(key, uid, email) {
    if (planDraft[key]) return
    if (!planRequests[key]) planRequests[key] = []
    if (planRequests[key].some((r) => r.uid === uid)) return
    planRequests[key].push({ uid, email })
    persist()
  }

  function cancelRequest(key, uid) {
    if (!planRequests[key]) return
    planRequests[key] = planRequests[key].filter((r) => r.uid !== uid)
    if (!planRequests[key].length) delete planRequests[key]
    persist()
  }

  function acceptRequest(key, request) {
    planDraft[key] = request.email
    delete planRequests[key]
    persist()
  }

  function declineRequest(key, request) {
    if (!planRequests[key]) return
    planRequests[key] = planRequests[key].filter((r) => r.uid !== request.uid)
    if (!planRequests[key].length) delete planRequests[key]
    persist()
  }

  return {
    sections,
    reservations,
    categories,
    articulos,
    openTables,
    business,
    planDraft,
    planPublished,
    planLocked,
    planRequests,
    theme,
    history24,
    syncStatus,
    load,
    persist,
    setTheme,
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
    saveBusiness,
    lockPlan,
    unlockPlan,
    requestSlot,
    cancelRequest,
    acceptRequest,
    declineRequest,
  }
})
