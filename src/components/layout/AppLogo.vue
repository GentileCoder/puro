<script setup>
defineProps({ size: { type: Number, default: 28 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" class="app-logo">
    <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3" />
    <circle cx="32" cy="32" r="15.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.55" />
    <text x="32" y="33" text-anchor="middle" dominant-baseline="central" class="app-logo-letter" font-weight="700" font-size="25" fill="currentColor">P</text>
  </svg>
</template>

<style scoped>
.app-logo { color: var(--color-primary-hover); flex-shrink: 0; }
.app-logo-letter { font-family: var(--font-heading); }
</style>
