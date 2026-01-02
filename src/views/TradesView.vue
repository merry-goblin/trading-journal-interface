<script setup>
import { onMounted, ref } from 'vue'
import TradeList from '@/components/TradeList.vue'
import api from '@/services/api'

const trades = ref([])
const loading = ref(true)

onMounted(async () => {
  const response = await api.get('/trades')
  trades.value = response.data
  loading.value = false
})
</script>

<template>
  <h1>Journal de trading</h1>

  <p v-if="loading">Chargement...</p>

  <TradeList v-else :trades="trades" />
</template>
