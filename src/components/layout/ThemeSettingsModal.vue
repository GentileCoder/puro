<script setup>
import { ref, watch } from 'vue'
import { usePuroStore } from '../../stores/puro'
import { THEMES } from '../../theme/themes'

const props = defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close'])
const puro = usePuroStore()

const selectedId = ref(puro.theme.id)
const selectedMode = ref(puro.theme.mode)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    selectedId.value = puro.theme.id
    selectedMode.value = puro.theme.mode
  },
)

const themeEntries = Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, swatch: t.dark || t.light }))

function handleSave() {
  puro.setTheme(selectedId.value, selectedMode.value)
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 420px">
      <h2>Theme</h2>
      <div class="modal-sub">Applies to everyone, on every device — admin only</div>

      <label>Design</label>
      <div class="theme-grid">
        <button
          v-for="entry in themeEntries"
          :key="entry.id"
          type="button"
          class="theme-swatch"
          :class="{ sel: selectedId === entry.id }"
          @click="selectedId = entry.id"
        >
          <span
            class="swatch-preview"
            :style="{ background: entry.swatch.bg, borderColor: entry.swatch.border }"
          >
            <span class="swatch-dot" :style="{ background: entry.swatch.primary }"></span>
          </span>
          <span class="swatch-label">{{ entry.label }}</span>
        </button>
      </div>

      <label>Mode</label>
      <div class="mode-toggle">
        <button type="button" class="mode-btn" :class="{ sel: selectedMode === 'dark' }" @click="selectedMode = 'dark'">Dark</button>
        <button type="button" class="mode-btn" :class="{ sel: selectedMode === 'light' }" @click="selectedMode = 'light'">Light</button>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">Cancel</button>
        <button class="btn-save" @click="handleSave">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 4px; }
.theme-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
}
.theme-swatch.sel { border-color: var(--color-primary); background: var(--color-surface-raised); }
.swatch-preview {
  width: 44px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}
.swatch-dot { width: 14px; height: 14px; border-radius: 50%; }
.swatch-label { font-size: 10px; color: var(--color-text-muted); text-align: center; line-height: 1.2; }
.mode-toggle { display: flex; gap: 6px; margin-top: 4px; }
.mode-btn {
  flex: 1;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
}
.mode-btn.sel { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
</style>
