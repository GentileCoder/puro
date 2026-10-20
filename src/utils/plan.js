// Tue–Sat, offsets from that week's Monday.
export const DAY_OFFSETS = [1, 2, 3, 4, 5]

// Slot names differ by weekday — Mon-wrapped index 1-3 (Wed/Thu/Fri) get two
// springer slots, index 4-5 (Sat + the second `Fijo`) get two fixed slots instead.
// This is data-shaped, not obviously a "feature" — easy to silently flatten to
// one shared slot list when porting. Keep the per-day table.
export const SLOTS = {
  1: ['Fijo', 'Springer 1', 'Springer 2'],
  2: ['Fijo', 'Springer 1', 'Springer 2'],
  3: ['Fijo', 'Springer 1', 'Springer 2'],
  4: ['Fijo 1', 'Fijo 2', 'Springer'],
  5: ['Fijo 1', 'Fijo 2', 'Springer'],
}

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
