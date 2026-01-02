<script setup>
defineProps({
  trades: Array
})
</script>

<template>
  <ul>
    <li v-for="trade in trades" :key="trade.id">
      {{ trade.symbol }} – {{ trade.pnl }} €
    </li>
  </ul>
</template>
