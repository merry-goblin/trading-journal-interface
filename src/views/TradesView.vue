<script setup>
import { onMounted, ref } from 'vue'
import TradeList from '@/components/TradeList.vue'
import { getTrades } from '@/services/tradeService'

const trades = ref([])
const loading = ref(true)

onMounted(async () => {
  const response = await getTrades()
  trades.value = response.data
  loading.value = false
})

const editTrade = (trade) => {
  console.log('editTrade')
}

const deleteTrade = (id) => {
  console.log('deleteTrade: '+id)
}

</script>

<template>
  <h1>Journal de trading</h1>
  <p v-if="loading">Chargement...</p>
  <TradeList
      v-else
      :trades="trades"
      @edit="editTrade"
      @delete="deleteTrade"
  />
</template>
