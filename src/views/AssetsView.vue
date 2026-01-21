<script setup>
import { onMounted, ref } from 'vue'
import AssetList from '@/components/AssetList.vue'
import { getAssets } from '@/services/assetService'

const assets = ref([])
const loading = ref(true)

onMounted(async () => {
  const response = await getAssets()
  assets.value = response.data
  loading.value = false
})

const doStuff = (asset) => {
  console.log('do stuff')
}

</script>

<template>
  <h1>Assets</h1>

  <p v-if="loading">Loading...</p>

  <AssetList
      v-else
      :assets="assets"
      @doStuff="doStuff"
  />
</template>
