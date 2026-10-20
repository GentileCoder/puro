import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listBusinesses, createBusiness as apiCreateBusiness } from '../services/businessApi'
import { useAuthStore } from './auth'

const LAST_BUSINESS_KEY = 'puro-last-business-id'

export const useBusinessStore = defineStore('business', () => {
  const businesses = ref([])       // admin only
  const activeBusinessId = ref(null)
  const blocked = ref(false)       // non-admin with no businessId claim

  async function resolveActiveBusiness() {
    const auth = useAuthStore()
    blocked.value = false

    if (auth.role === 'admin') {
      try {
        businesses.value = await listBusinesses()
      } catch {
        businesses.value = []
      }
      let stored = null
      try {
        stored = localStorage.getItem(LAST_BUSINESS_KEY)
      } catch {
        // ignore — private browsing / blocked storage
      }
      const storedStillExists = stored && businesses.value.some((b) => b.id === stored)
      activeBusinessId.value = storedStillExists ? stored : (businesses.value[0]?.id || null)
      return
    }

    if (auth.businessId) {
      activeBusinessId.value = auth.businessId
    } else {
      activeBusinessId.value = null
      blocked.value = true
    }
  }

  function selectBusiness(id) {
    activeBusinessId.value = id
    try {
      localStorage.setItem(LAST_BUSINESS_KEY, id)
    } catch {
      // ignore
    }
  }

  async function createBusiness(name) {
    const business = await apiCreateBusiness(name)
    businesses.value.push(business)
    selectBusiness(business.id)
    return business
  }

  return { businesses, activeBusinessId, blocked, resolveActiveBusiness, selectBusiness, createBusiness }
})
