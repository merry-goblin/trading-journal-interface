<script setup>
import { onMounted, ref } from 'vue'
import ScreenshotList from '@/components/ScreenshotList.vue'
import { getScreenshots } from '@/services/screenshotService'

const screenshots = ref([])
const loading = ref(true)

onMounted(async () => {
  const response = await getScreenshots()
  screenshots.value = response.data
  loading.value = false
})

const doStuff = (screenshot) => {
  console.log('do stuff')
}

</script>

<template>
  <h1>Screenshots</h1>

  <p v-if="loading">Loading...</p>

  <ScreenshotList
      v-else
      :screenshots="screenshots"
      @doStuff="doStuff"
  />
</template>
