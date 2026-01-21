<script setup>
import TradeRow from './TradeRow.vue'

defineProps({
  trades: Array
})

const emit = defineEmits(['edit', 'delete'])
</script>

<template>
  <table>
    <tbody>
    <TradeRow
        v-for="trade in trades"
        :key="trade.id"
        :trade="trade"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
    />
    </tbody>
  </table>
</template>
