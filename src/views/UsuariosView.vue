<script setup>
import { ref, onMounted } from 'vue'
import { listUsers, updateUserRole, deleteUser } from '../services/usersApi'
import { useI18n } from '../i18n'
import AddUserModal from '../components/usuarios/AddUserModal.vue'

const { t } = useI18n()

const users = ref([])
const loading = ref(true)
const loadError = ref(false)
const modalOpen = ref(false)

async function loadUsers() {
  loading.value = true
  loadError.value = false
  try {
    users.value = await listUsers()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)

async function handleRoleChange(uid, role) {
  try {
    await updateUserRole(uid, role)
  } catch {
    alert(t('users.error_role'))
    loadUsers()
  }
}

async function handleDelete(uid, email) {
  if (!confirm(t('users.confirm_delete').replace('{email}', email))) return
  try {
    await deleteUser(uid)
    loadUsers()
  } catch {
    alert(t('users.error_delete'))
  }
}

function handleCreated() {
  modalOpen.value = false
  loadUsers()
}
</script>

<template>
  <div class="content active">
    <div class="toolbar">
      <button class="btn-primary" @click="modalOpen = true">{{ t('users.new') }}</button>
    </div>
    <div v-if="loading" style="color: #666; font-size: 13px">{{ t('users.loading') }}</div>
    <div v-else-if="loadError" style="color: #e87c7c; font-size: 13px">{{ t('users.error_load') }}</div>
    <div v-else-if="!users.length" style="color: #666; font-size: 13px">{{ t('users.empty') }}</div>
    <div v-else>
      <div v-for="u in users" :key="u.uid" class="user-row">
        <div>
          <div style="font-size: 13px; font-weight: 600">{{ u.email }}</div>
          <div style="font-size: 11px; color: #888; margin-top: 2px">UID: {{ u.uid }}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center">
          <select :value="u.role" @change="handleRoleChange(u.uid, $event.target.value)">
            <option value="admin">admin</option>
            <option value="staff">staff</option>
            <option value="manager">manager</option>
          </select>
          <button class="res-act-btn del" @click="handleDelete(u.uid, u.email)">{{ t('users.delete') }}</button>
        </div>
      </div>
    </div>

    <AddUserModal :open="modalOpen" @close="modalOpen = false" @created="handleCreated" />
  </div>
</template>
