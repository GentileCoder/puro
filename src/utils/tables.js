export function allTables(sections) {
  return sections.reduce((acc, s) => acc.concat(s.tables), [])
}

export function resTableIds(r) {
  return r.tables || (r.table != null ? [r.table] : [])
}

// Double tables key their two slots as `${tableId}_0` / `${tableId}_1`;
// a single (or "whole table") order keys on the bare table id.
export function getOrderKey(tableId, slot) {
  return slot === 0 || slot === 1 ? `${tableId}_${slot}` : tableId
}

export function orderTotal(items) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
