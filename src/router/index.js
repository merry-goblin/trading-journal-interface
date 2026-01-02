import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import AssetsView from '@/views/AssetsView.vue'
import TradesView from '@/views/TradesView.vue'

const routes = [
    {
        path: '/login',
        component: LoginView
    },
    {
        path: '/trades',
        component: TradesView,
        meta: { requiresAuth: true }
    },
    {
        path: '/assets',
        component: AssetsView,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('jwt')

    if (to.meta.requiresAuth && !token) {
        next('/login')
    } else {
        next()
    }
})

export default router
