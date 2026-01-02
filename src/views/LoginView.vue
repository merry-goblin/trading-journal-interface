<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login as loginRequest } from '@/services/authService'

const email = ref('')
const password = ref('')
const error = ref(null)
const router = useRouter()

var loading = false;

const login = async () => {
  try {
    loading = true;
    const response = await loginRequest(email.value, password.value)
    localStorage.setItem('jwt', response.data.token)
console.log('token to save for future calls')
console.log(response.data.token)
console.log(response.data)
    router.push('/assets')
  } catch {
    loading = false;
    error.value = 'Identifiants invalides'
  }
}
</script>


<template>
  <div class="login-container">
    <h1>Connexion</h1>

    <form @submit.prevent="login">
      <input
          type="email"
          v-model="email"
          placeholder="Email"
          required
      />

      <input
          type="password"
          v-model="password"
          placeholder="Mot de passe"
          required
      />

      <button type="submit" :disabled="loading">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 3rem auto;
}
.error {
  color: red;
}
</style>
