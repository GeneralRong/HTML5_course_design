import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import Vant from 'vant'
import 'vant/lib/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { seedIfEmpty } from './lib/seed'

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Vant)

seedIfEmpty().finally(() => app.mount('#app'))
