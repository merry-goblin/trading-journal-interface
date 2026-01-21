import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import AssetsView from '@/views/AssetsView.vue'
import TradesView from '@/views/TradesView.vue'
import ScreenshotsView from '@/views/ScreenshotsView.vue'

const routes = [
    {
        path: '/login',
        component: LoginView,
        meta: { public: true }
    },
    {
        path: '/trades',
        component: TradesView
    },
    {
        path: '/assets',
        component: AssetsView
    },
    {
        path: '/screenshots',
        component: ScreenshotsView
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('jwt')

    if (!to.meta.public && !token) {
        next('/login')
    } else {
        next()
    }
})

export default router
