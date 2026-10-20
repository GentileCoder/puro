<script setup>
import { computed } from 'vue'
import { usePuroStore } from '../../stores/puro'
import { hasGlow } from '../../theme/applyTheme'

const puro = usePuroStore()
const showGlow = computed(() => hasGlow(puro.theme.id))
</script>

<template>
  <div v-if="showGlow" class="theme-glow"></div>
</template>

<style scoped>
/* Sunset's decorative background glow — the only theme with one. Fixed,
   behind all content, never intercepts clicks. */
.theme-glow {
  position: fixed;
  top: -120px;
  right: -120px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: var(--color-primary);
  filter: blur(50px);
  opacity: 0.45;
  z-index: -1;
  pointer-events: none;
}
</style>
