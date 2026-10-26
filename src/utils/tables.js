export function allTables(sections) {
  return sections.reduce((acc, s) => acc.concat(s.tables), [])
}

export function resTableIds(r) {
  return r.tables || (r.table != null ? [r.table] : [])
}

// Double tables key their two slots as `${tableId}_0` / `${tableId}_1`; a
// split-bill sub-bill (an arbitrary number of separate checks on any table,
// e.g. "1.0"/"1.1"/"1.2") keys as `${tableId}_s<index>` — the `_s` prefix
// keeps it from ever colliding with the double-slot keys even if a table
// happens to be both double and split. A single (or "whole table") order
// keys on the bare table id.
export function getOrderKey(tableId, slot) {
  if (slot === 0 || slot === 1) return `${tableId}_${slot}`
  if (typeof slot === 'string') return `${tableId}_s${slot}`
  return tableId
}

export function orderTotal(items) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
