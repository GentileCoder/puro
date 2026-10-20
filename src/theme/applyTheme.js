import { THEMES, DEFAULT_THEME } from './themes'

const loadedFontHrefs = new Set()

function ensureFontLoaded(href) {
  if (!href || loadedFontHrefs.has(href)) return
  loadedFontHrefs.add(href)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

// Sets the raw --t-* custom properties on :root; tokens.css derives every
// component-facing token (--color-success-bg, --color-primary-hover, etc.)
// from these, so no component CSS needs to change per theme.
export function applyTheme(themeId, mode) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME.id]
  const tokens = theme[mode] || theme[DEFAULT_THEME.mode]
  const root = document.documentElement.style

  root.setProperty('--t-bg', tokens.bg)
  root.setProperty('--t-surface', tokens.surface)
  root.setProperty('--t-surface-raised', tokens.surfaceRaised)
  root.setProperty('--t-border', tokens.border)
  root.setProperty('--t-text', tokens.text)
  root.setProperty('--t-text-muted', tokens.textMuted)
  root.setProperty('--t-text-faint', tokens.textFaint)
  root.setProperty('--t-primary', tokens.primary)
  root.setProperty('--t-primary-text', tokens.primaryText)
  root.setProperty('--t-success', tokens.success)
  root.setProperty('--t-danger', tokens.danger)
  root.setProperty('--t-danger-strong', tokens.dangerStrong)
  root.setProperty('--t-warning', tokens.warning)
  root.setProperty('--t-info', tokens.info)
  root.setProperty('--t-gold', tokens.gold)
  root.setProperty('--t-flag-blue', tokens.flagBlue)
  root.setProperty('--t-card-shadow', tokens.cardShadow)
  root.setProperty('--t-font-heading', theme.fonts.heading)
  root.setProperty('--t-font-body', theme.fonts.body)
  root.setProperty('--t-radius-lg', `${theme.radiusLg ?? 10}px`)

  ensureFontLoaded(theme.fonts.href)
}

export function fanIdFor(themeId) {
  return THEMES[themeId]?.fanId || null
}

export function hasGlow(themeId) {
  return !!THEMES[themeId]?.hasGlow
}
