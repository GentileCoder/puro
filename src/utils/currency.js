// European format (comma decimal separator, period thousands) regardless of
// UI language — a currency convention, not a translation.
const PRICE_FORMATTER = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatPrice(amount) {
  return `€${PRICE_FORMATTER.format(amount)}`
}
