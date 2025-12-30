<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const trades = ref([])
const loading = ref(true)
const error = ref(null)

const loadTrades = async () => {
  try {
    const response = await api.get('/trades')
    trades.value = response.data
  } catch (e) {
    error.value = 'Impossible de charger les trades'
  } finally {
    loading.value = false
  }
}

onMounted(loadTrades)
</script>

<template>
  <div>
    <h2>Journal de trading</h2>

    <p v-if="loading">Chargement...</p>
    <p v-if="error">{{ error }}</p>

    <table v-if="!loading && trades.length">
      <thead>
      <tr>
        <th>Date</th>
        <th>Actif</th>
        <th>Type</th>
        <th>Résultat</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="trade in trades" :key="trade.id">
        <td>{{ trade.date }}</td>
        <td>{{ trade.asset }}</td>
        <td>{{ trade.type }}</td>
        <td :class="{ positive: trade.result > 0, negative: trade.result < 0 }">
          {{ trade.result }}
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.positive { color: green; }
.negative { color: red; }
</style>
