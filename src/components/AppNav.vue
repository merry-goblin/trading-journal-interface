<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

function handleLogout() {
    auth.logout()
    router.push('/login')
}
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-icon">📈</span>
      <span>Journal</span>
    </div>

    <ul class="nav-links">
      <li><router-link to="/dashboard"><span class="nav-icon">📊</span>Dashboard</router-link></li>
      <li><router-link to="/journal"><span class="nav-icon">📋</span>Journal</router-link></li>
      <li><router-link to="/observations"><span class="nav-icon">🔭</span>Observations</router-link></li>
      <li><router-link to="/stats"><span class="nav-icon">📈</span>Statistiques</router-link></li>
      <li><router-link to="/tags"><span class="nav-icon">🏷️</span>Tags</router-link></li>
      <li><router-link to="/import"><span class="nav-icon">⬆️</span>Import MT5</router-link></li>
    </ul>

    <div class="sidebar-footer">
      <button class="btn btn-ghost btn-sm" style="width:100%" @click="handleLogout">
        ← Déconnexion
      </button>
    </div>
  </nav>
</template>
