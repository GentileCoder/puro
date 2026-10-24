<script setup>
import { useI18n } from '../../i18n'

const props = defineProps({
  element: { type: Object, required: true },
  // A short label naming the specific element being edited (e.g. "Table
  // 15", "Wall") — this panel edits ONLY this one element, not the
  // facility-wide "new table" default up in the palette, and the two
  // "Shape" controls look similar enough that this needs to be explicit.
  title: { type: String, default: '' },
})
const emit = defineEmits(['update', 'delete'])
const { t } = useI18n()

function num(v, fallback) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}
</script>

<template>
  <div class="fp-panel">
    <div class="fp-panel-title">{{ title }}</div>
    <div class="fp-panel-row">
      <label>{{ t('floorplan.width') }}</label>
      <input type="number" min="10" :value="element.width" @input="emit('update', { width: num($event.target.value, element.width) })">
    </div>
    <div class="fp-panel-row">
      <label>{{ t('floorplan.height') }}</label>
      <input type="number" min="10" :value="element.height" @input="emit('update', { height: num($event.target.value, element.height) })">
    </div>
    <div class="fp-panel-row">
      <label>{{ t('floorplan.rotation') }}</label>
      <input type="number" step="15" :value="element.rotation || 0" @input="emit('update', { rotation: num($event.target.value, 0) })">
    </div>
    <template v-if="element.type === 'table'">
      <div class="fp-panel-row">
        <label>{{ t('floorplan.shape') }}</label>
        <select :value="element.shape" @change="emit('update', { shape: $event.target.value })">
          <option value="round">{{ t('floorplan.shape_round') }}</option>
          <option value="rect">{{ t('floorplan.shape_rect') }}</option>
        </select>
      </div>
      <div class="fp-panel-row">
        <label>{{ t('floorplan.chairs') }}</label>
        <input type="number" min="0" max="12" :value="element.chairs" @input="emit('update', { chairs: num($event.target.value, element.chairs) })">
      </div>
    </template>
    <button class="res-act-btn del" style="width: 100%; margin-top: 2px" @click="emit('delete')">{{ t('floorplan.delete_element') }}</button>
  </div>
</template>

<style scoped>
.fp-panel {
  position: absolute;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  width: 150px;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2;
}
.fp-panel-title { font-size: 12px; font-weight: 700; color: var(--color-text); padding-bottom: 4px; border-bottom: 1px solid var(--color-border); }
.fp-panel-row { display: flex; flex-direction: column; gap: 3px; }
.fp-panel-row label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.fp-panel-row input, .fp-panel-row select { width: 100%; font-size: 12px; padding: 4px 6px; }
</style>
