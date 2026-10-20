import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import './styles/tokens.css'
import './styles/base.css'
import './styles/utilities.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Delay installing the router (not just mounting) until the session-restore
// promise resolves — vue-router's first navigation guard check runs the
// moment app.use(router) executes, and must not see a not-yet-populated user.
useAuthStore()
  .init()
  .then(() => {
    app.use(router)
    app.mount('#app')
  })
