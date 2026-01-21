<script setup>
defineProps({
  asset: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['doStuff'])
</script>

<template>
  <tr>
    <td>{{ asset.id }}</td>
    <td>{{ asset.symbol }}</td>
    <td>{{ asset.type }}</td>

    <td>
      <button @click="emit('doStuff', asset)">✏️</button>
    </td>
  </tr>
</template>
