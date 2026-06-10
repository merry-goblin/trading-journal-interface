import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, me as apiMe } from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('jwt') || null)
    const user  = ref(null)

    const isAuthenticated = computed(() => !!token.value)

    async function login(email, password) {
        const res = await apiLogin(email, password)
        token.value = res.data.token
        localStorage.setItem('jwt', res.data.token)
    }

    async function fetchUser() {
        if (!token.value) return
        const res = await apiMe()
        user.value = res.data
    }

    function logout() {
        token.value = null
        user.value  = null
        localStorage.removeItem('jwt')
    }

    return { token, user, isAuthenticated, login, fetchUser, logout }
})
