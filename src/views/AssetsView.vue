<script setup>
import { onMounted, ref } from 'vue'
import AssetList from '@/components/AssetList.vue'
import api from '@/services/api'

const assets = ref([])
const loading = ref(true)

onMounted(async () => {
  const response = await api.get('/assets')
  assets.value = response.data
  loading.value = false
})
</script>

<template>
  <h1>Assets</h1>

  <p v-if="loading">Loading...</p>

  <AssetList v-else :assets="assets" />
</template>
