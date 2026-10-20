<script setup>
defineProps({
  size: { type: Number, default: 28 },
  // 'simple' (ring + letter only) is for anywhere the mark renders small —
  // header, anything near favicon size. 'full' (+ fork & wine glass) is only
  // for contexts large enough to actually read the detail, like the login
  // screen — tested at 16-32px the flanking elements just turn into noise.
  variant: { type: String, default: 'simple' },
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" class="app-logo">
    <template v-if="variant === 'full'">
      <circle cx="32" cy="32" r="13" fill="none" stroke="currentColor" stroke-width="2.6" />
      <circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.55" />
      <text x="32" y="33" text-anchor="middle" dominant-baseline="central" class="app-logo-letter" font-weight="700" font-size="14" fill="currentColor">P</text>
      <!-- fork, left -->
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none">
        <line x1="5" y1="9" x2="5" y2="21" /><line x1="9" y1="9" x2="9" y2="21" /><line x1="13" y1="9" x2="13" y2="21" />
        <path d="M5 21 Q5 26 9 26 Q13 26 13 21" /><line x1="9" y1="26" x2="9" y2="55" />
      </g>
      <!-- wine glass, right -->
      <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M51 9 L61 9 Q61 21 56 24 Q51 21 51 9 Z" />
        <line x1="56" y1="24" x2="56" y2="50" />
        <line x1="50" y1="55" x2="62" y2="55" />
      </g>
    </template>
    <template v-else>
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3" />
      <circle cx="32" cy="32" r="15.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.55" />
      <text x="32" y="33" text-anchor="middle" dominant-baseline="central" class="app-logo-letter" font-weight="700" font-size="25" fill="currentColor">P</text>
    </template>
  </svg>
</template>

<style scoped>
.app-logo { color: var(--color-primary-hover); flex-shrink: 0; }
.app-logo-letter { font-family: var(--font-heading); }
</style>
