import { ref, computed } from 'vue'
import { TRANSLATIONS } from './translations'

const LOCALES = { es: 'es-ES', en: 'en-US', de: 'de-DE' }

const currentLang = ref(localStorage.getItem('lang') || 'es')

function t(key) {
  const dict = TRANSLATIONS[currentLang.value] || TRANSLATIONS.es
  if (dict[key] !== undefined) return dict[key]
  return TRANSLATIONS.es[key] !== undefined ? TRANSLATIONS.es[key] : key
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return
  currentLang.value = lang
  localStorage.setItem('lang', lang)
}

function getLangLocale() {
  return LOCALES[currentLang.value] || 'es-ES'
}

// Index 0=Monday..6=Sunday, matching ISO weekday numbers (1-7) minus 1.
const DAY_KEYS = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun']

function getDayNames() {
  return DAY_KEYS.map((key) => t(key))
}

// isoWeekday: 1=Monday..7=Sunday
function getDayName(isoWeekday) {
  return t(DAY_KEYS[isoWeekday - 1])
}

function slotLabel(slot) {
  const key = `slot.${slot}`
  const label = t(key)
  return label !== key ? label : slot
}

// Single composable, shared state — every component re-renders on language
// change automatically through Vue reactivity (no manual applyTranslations()/
// refreshUI() pass needed, unlike the legacy DOM-attribute approach).
export function useI18n() {
  return {
    currentLang: computed(() => currentLang.value),
    t,
    setLanguage,
    getLangLocale,
    getDayNames,
    getDayName,
    slotLabel,
  }
}
