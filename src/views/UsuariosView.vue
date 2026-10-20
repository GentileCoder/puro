<script setup>
import { ref, onMounted } from 'vue'
import { listUsers, updateUser, deleteUser } from '../services/usersApi'
import { useI18n } from '../i18n'
import { useBusinessStore } from '../stores/business'
import AddUserModal from '../components/usuarios/AddUserModal.vue'

const { t } = useI18n()
const business = useBusinessStore()

// This is the break-glass account used to administer the gentilecoder GCP
// project itself (Console/gcloud/firebase-tools) — removable here would mean
// a UI click could lock everyone out of the infrastructure, not just the app.
const PROTECTED_ADMIN_EMAIL = 'gentile.leon0511@gmail.com'

const users = ref([])
const loading = ref(true)
const loadError = ref(false)
const modalOpen = ref(false)
const confirmingUid = ref(null)

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

async function handleRoleChange(u, role) {
  try {
    await updateUser(u.uid, role, u.businessId)
  } catch (e) {
    alert(e.message || t('users.error_role'))
  } finally {
    loadUsers()
  }
}

async function handleBusinessChange(u, businessId) {
  try {
    await updateUser(u.uid, u.role, businessId)
  } catch (e) {
    alert(e.message || t('users.error_role'))
  } finally {
    loadUsers()
  }
}

function requestDelete(uid) {
  confirmingUid.value = uid
}

function cancelDelete() {
  confirmingUid.value = null
}

async function confirmDelete(uid) {
  try {
    await deleteUser(uid)
    loadUsers()
  } catch (e) {
    alert(e.message || t('users.error_delete'))
  } finally {
    confirmingUid.value = null
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
          <span v-if="u.email === PROTECTED_ADMIN_EMAIL" style="font-size: 12px; color: #888">admin</span>
          <template v-else>
            <select :value="u.role" @change="handleRoleChange(u, $event.target.value)">
              <option value="admin">admin</option>
              <option value="staff">staff</option>
              <option value="manager">manager</option>
            </select>
            <select
              v-if="u.role !== 'admin'"
              :value="u.businessId"
              style="max-width: 140px"
              @change="handleBusinessChange(u, $event.target.value)"
            >
              <option value="">{{ t('business.unassigned_option') }}</option>
              <option v-for="b in business.businesses" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </template>
          <template v-if="u.email !== PROTECTED_ADMIN_EMAIL">
            <template v-if="confirmingUid === u.uid">
              <button class="res-act-btn del" @click="confirmDelete(u.uid)">{{ t('users.delete_confirm') }}</button>
              <button class="res-act-btn" @click="cancelDelete">{{ t('modal.cancel') }}</button>
            </template>
            <button v-else class="res-act-btn del" @click="requestDelete(u.uid)">{{ t('users.delete') }}</button>
          </template>
        </div>
      </div>
    </div>

    <AddUserModal :open="modalOpen" @close="modalOpen = false" @created="handleCreated" />
  </div>
</template>
