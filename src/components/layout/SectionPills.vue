<script setup>
import { useI18n } from '../../i18n'

const props = defineProps({
  sections: { type: Array, required: true },
  active: { type: [String, Number], required: true },
})
const emit = defineEmits(['update:active'])
const { t } = useI18n()
</script>

<template>
  <div class="section-pills">
    <button class="pill" :class="{ active: props.active === 'all' }" @click="emit('update:active', 'all')">{{ t('tabs.all') }}</button>
    <button
      v-for="sec in props.sections"
      :key="sec.id"
      class="pill"
      :class="{ active: props.active === sec.id }"
      @click="emit('update:active', sec.id)"
    >{{ sec.name }}</button>
  </div>
</template>
