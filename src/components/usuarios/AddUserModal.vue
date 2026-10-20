<script setup>
import { ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import { createUser } from '../../services/usersApi'

const props = defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close', 'created'])
const { t } = useI18n()

const email = ref('')
const password = ref('')
const role = ref('staff')
const error = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    email.value = ''
    password.value = ''
    role.value = 'staff'
    error.value = ''
  },
)

async function handleCreate() {
  if (!email.value.trim() || !password.value) {
    error.value = t('users.email_required')
    return
  }
  error.value = ''
  try {
    await createUser(email.value.trim(), password.value, role.value)
    emit('created')
  } catch {
    error.value = t('users.error_create')
  }
}
</script>

<template>
  <div class="modal-overlay" :class="{ open }">
    <div class="modal" style="width: 340px">
      <h2>{{ t('user_modal.title') }}</h2>
      <label>{{ t('user_modal.email_label') }}</label>
      <input v-model="email" type="email" :placeholder="t('user_modal.email_ph')">
      <label>{{ t('user_modal.password_label') }}</label>
      <input v-model="password" type="password" :placeholder="t('login.password')">
      <label>{{ t('user_modal.role_label') }}</label>
      <select v-model="role">
        <option value="staff">staff</option>
        <option value="manager">manager</option>
        <option value="admin">admin</option>
      </select>
      <div style="font-size: 12px; color: var(--color-danger-fg); min-height: 16px; margin-top: 8px">{{ error }}</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">{{ t('modal.cancel') }}</button>
        <button class="btn-save" @click="handleCreate">{{ t('modal.create') }}</button>
      </div>
    </div>
  </div>
</template>
