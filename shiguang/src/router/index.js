import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Publish from '../views/Publish.vue'
import Match from '../views/Match.vue'
import Me from '../views/Me.vue'
import Detail from '../views/Detail.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/publish', component: Publish },
    { path: '/match', component: Match },
    { path: '/me', component: Me },
    { path: '/detail/:id', component: Detail },
  ],
})
