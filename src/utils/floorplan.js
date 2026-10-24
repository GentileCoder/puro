// Logical canvas size, rendered through an SVG viewBox — scales responsively
// for free, no resize-observer needed. All element x/y are the element's
// own CENTER (not top-left), which makes rotation a single transform.
export const CANVAS_WIDTH = 1000
export const CANVAS_HEIGHT = 700

const CHAIR_GAP = 14
export const CHAIR_RADIUS = 7

let nextId = 1
function newId() {
  return `fp-${Date.now()}-${nextId++}`
}

export function createWallElement() {
  return { id: newId(), type: 'wall', x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, width: 160, height: 14, rotation: 0 }
}

export function createDoorElement() {
  return { id: newId(), type: 'door', x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, width: 50, height: 10, rotation: 0 }
}

export function createWindowElement() {
  return { id: newId(), type: 'window', x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, width: 70, height: 8, rotation: 0 }
}

// table: a real { id, type: 'single'|'double' } from sections[].tables —
// the floor plan element only adds visual properties on top of it.
// defaults: the business's own configured shape/size for newly placed
// tables (puro.floorPlan.defaultTable), or null/undefined to fall back to
// the built-in single/double sizing below — most restaurants use one
// uniform table size, so this one setting applies to single and double
// tables alike rather than differentiating by type.
export function createTableElement(table, defaults) {
  const isDouble = table.type === 'double'
  return {
    id: newId(),
    type: 'table',
    tableId: table.id,
    shape: defaults?.shape ?? (isDouble ? 'rect' : 'round'),
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: defaults?.width ?? (isDouble ? 90 : 60),
    height: defaults?.height ?? (isDouble ? 55 : 60),
    rotation: 0,
    // Starts at 0 — chairs are opt-in, added from the properties panel.
    chairs: 0,
  }
}

// Chair centers in the element's own local frame (origin at its center,
// unrotated) — the caller draws them inside the same rotate() transform as
// the table shape, so they turn together with no extra math.
export function chairPositions(el) {
  const n = Math.max(0, el.chairs || 0)
  if (!n) return []
  if (el.shape === 'round') {
    const rx = el.width / 2 + CHAIR_GAP
    const ry = el.height / 2 + CHAIR_GAP
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) }
    })
  }
  return rectChairPositions(el.width, el.height, n)
}

// Allocates chairs to each of the 4 sides proportional to that side's
// length, then spaces them evenly WITHIN the side — never at the corners.
// (A single continuous walk around the perimeter, tried first, evenly
// spaces by arc-length only, which can land two chairs from different sides
// right next to each other straddling a corner instead of one per side.)
function rectChairPositions(w, h, n) {
  const sides = [
    { key: 'top', length: w },
    { key: 'right', length: h },
    { key: 'bottom', length: w },
    { key: 'left', length: h },
  ]
  const totalLength = 2 * (w + h)
  const raw = sides.map((s) => (s.length / totalLength) * n)
  const counts = raw.map(Math.floor)
  const remaining = n - counts.reduce((a, b) => a + b, 0)
  const byRemainderDesc = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < remaining; k++) counts[byRemainderDesc[k].i]++

  const halfW = w / 2
  const halfH = h / 2
  const points = []
  sides.forEach((side, i) => {
    const count = counts[i]
    for (let j = 0; j < count; j++) {
      // Fraction along the side, skipping the corners (e.g. 2 chairs land
      // at 1/3 and 2/3, not at the 0/1 endpoints).
      const t = (j + 1) / (count + 1)
      if (side.key === 'top') points.push({ x: -halfW + t * w, y: -halfH - CHAIR_GAP })
      else if (side.key === 'right') points.push({ x: halfW + CHAIR_GAP, y: -halfH + t * h })
      else if (side.key === 'bottom') points.push({ x: halfW - t * w, y: halfH + CHAIR_GAP })
      else points.push({ x: -halfW - CHAIR_GAP, y: halfH - t * h })
    }
  })
  return points
}
