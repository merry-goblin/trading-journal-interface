import { createRouter, createWebHistory } from 'vue-router'
import LoginView          from '@/views/LoginView.vue'
import DashboardView      from '@/views/DashboardView.vue'
import JournalView        from '@/views/JournalView.vue'
import PositionDetailView from '@/views/PositionDetailView.vue'
import ObservationsView   from '@/views/ObservationsView.vue'
import StatsView          from '@/views/StatsView.vue'

const routes = [
    { path: '/login',         component: LoginView,          meta: { public: true } },
    { path: '/',              redirect: '/dashboard' },
    { path: '/dashboard',     component: DashboardView },
    { path: '/journal',       component: JournalView },
    { path: '/journal/:id',   component: PositionDetailView },
    { path: '/observations',  component: ObservationsView },
    { path: '/stats',         component: StatsView },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
    const token = localStorage.getItem('jwt')
    if (!to.meta.public && !token) return '/login'
})

export default router
