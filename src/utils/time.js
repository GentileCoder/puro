// Local calendar date, not UTC — toISOString() would be a day off near midnight
// in whatever timezone the restaurant actually operates in.
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function timeToMinutes(s) {
  const [h, m] = s.split(':')
  return +h * 60 + +m
}

export function minutesToTime(m) {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h < 10 ? '0' : ''}${h}:${mm < 10 ? '0' : ''}${mm}`
}
