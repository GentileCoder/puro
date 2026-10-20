import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Role matrix transcribed from the live applyRoleVisibility() logic in
// legacy/src/js/auth.js — NOT from docs/Authentication_Implementation_Guide.md,
// whose admin/staff/springer role set was never actually shipped.
const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'Reservations', component: () => import('../views/ReservationsView.vue'), meta: { roles: ['admin', 'staff', 'manager'] } },
  { path: '/mesas', name: 'Mesas', component: () => import('../views/MesasView.vue'), meta: { roles: ['admin', 'staff', 'manager'] } },
  { path: '/articulos', name: 'Articulos', component: () => import('../views/ArticulosView.vue'), meta: { roles: ['admin', 'manager'] } },
  { path: '/historial', name: 'Historial', component: () => import('../views/HistorialView.vue'), meta: { roles: ['admin', 'manager'] } },
  { path: '/plan', name: 'Plan', component: () => import('../views/PlanView.vue'), meta: { roles: ['admin', 'staff', 'manager'] } },
  { path: '/negocio', name: 'Business', component: () => import('../views/BusinessView.vue'), meta: { roles: ['admin', 'manager'] } },
  { path: '/usuarios', name: 'Usuarios', component: () => import('../views/UsuariosView.vue'), meta: { roles: ['admin'] } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.user) return { name: 'Reservations' }
    return true
  }
  if (!auth.user) return { name: 'Login' }
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) return { name: 'Reservations' }
  return true
})
