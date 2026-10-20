import { resTableIds } from './tables'
import { timeToMinutes } from './time'

export function resStatus(tableId, date, reservations) {
  const rs = reservations.filter(
    (r) => resTableIds(r).includes(tableId) && r.date === date && r.status !== 'cancelled',
  )
  if (!rs.length) return 'free'
  return rs.length === 1 ? 'once' : 'multi'
}

// Greedy interval-packing for the book/timeline view: assigns each reservation
// a "lane" so overlapping reservations on the same row stack instead of collide.
// Ported as-is from the legacy renderer — don't rewrite the algorithm mid-migration.
export function calcLanes(items, closeMin) {
  const laneEnds = []
  items.forEach((r) => {
    const fromM = timeToMinutes(r.from)
    const toM = r.openEnd ? closeMin : timeToMinutes(r.to)
    let lane = -1
    for (let i = 0; i < laneEnds.length; i++) {
      if (fromM >= laneEnds[i]) {
        lane = i
        break
      }
    }
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    r._lane = lane
    laneEnds[lane] = toM
  })
  return Math.max(1, laneEnds.length)
}
