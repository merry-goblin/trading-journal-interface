<script setup>
defineProps({
  assets: Array
})
</script>

<template>
  <ul>
    <li v-for="asset in assets" :key="asset.id">
      {{ asset.symbol }} – {{ asset.type }} €
    </li>
  </ul>
</template>
