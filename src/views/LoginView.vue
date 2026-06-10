<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth   = useAuthStore()
const router = useRouter()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function handleLogin() {
    error.value   = ''
    loading.value = true
    try {
        await auth.login(email.value, password.value)
        router.push('/dashboard')
    } catch {
        error.value = 'Email ou mot de passe incorrect.'
    } finally {
        loading.value = false
    }
}
</script>

<template>
  <div class="login-box">
    <div class="login-title">📈 Trading Journal</div>
    <div class="login-sub">Connexion à votre espace</div>

    <form class="login-form" @submit.prevent="handleLogin">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input v-model="email" type="email" class="form-control" placeholder="you@example.com" required />
      </div>
      <div class="form-group">
        <label class="form-label">Mot de passe</label>
        <input v-model="password" type="password" class="form-control" placeholder="••••••••" required />
      </div>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <button type="submit" class="btn btn-primary" :disabled="loading" style="width:100%">
        <span v-if="loading">Connexion…</span>
        <span v-else>Se connecter</span>
      </button>
    </form>
  </div>
</template>
