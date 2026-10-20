export function getMondayOfWeek(offset) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - (day === 0 ? 6 : day - 1)
  d.setDate(diff + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

export function planKey(date, slot) {
  return `${date.toISOString().split('T')[0]}|${slot}`
}

// The 7 dates (Mon..Sun) of the week starting at `monday`.
export function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

// Every Monday-start week that touches the given month, clipped so each
// week's returned dates stay within that calendar month — used for the
// monthly/quarterly Plan view (quarterly uses the same month grid, just a
// different replan-cadence hint, see PlanView.vue).
export function getWeeksInMonth(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  const firstMonday = new Date(firstOfMonth)
  const firstDay = firstMonday.getDay()
  firstMonday.setDate(firstMonday.getDate() - (firstDay === 0 ? 6 : firstDay - 1))

  const weeks = []
  let cursor = new Date(firstMonday)
  while (cursor <= lastOfMonth) {
    weeks.push(new Date(cursor))
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

// ['fijo','springer','springer'] -> ['Fijo','Springer 1','Springer 2']
// A kind is only numbered when it appears more than once that day — matches
// the exact label strings the i18n dict has translations for.
export function deriveSlotLabels(kinds) {
  const counts = {}
  kinds.forEach((k) => { counts[k] = (counts[k] || 0) + 1 })
  const seen = {}
  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  return kinds.map((k) => {
    seen[k] = (seen[k] || 0) + 1
    return counts[k] > 1 ? `${titleCase(k)} ${seen[k]}` : titleCase(k)
  })
}
