<script setup>
defineProps({
  screenshot: {
    type: Object,
    required: true
  }
})

const showImage = async () => {
  console.log('show image')
}

const emit = defineEmits(['doStuff'])
</script>

<template>
  <tr>
    <td>{{ screenshot.id }}</td>
    <td>{{ screenshot.assetId }}</td>
    <td>{{ screenshot.timeframeId }}</td>

    <td>
      <button @click="showImage">
        Voir
      </button>
      <button @click="emit('doStuff', screenshot)">✏️</button>
    </td>
  </tr>
</template>
