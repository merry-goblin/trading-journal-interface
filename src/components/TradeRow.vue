<script setup>
defineProps({
  trade: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])
</script>

<template>
  <tr>
    <td>{{ trade.date }}</td>
    <td>{{ trade.symbol }}</td>
    <td>{{ trade.quantity }}</td>
    <td>{{ trade.price }}</td>
    <td>{{ trade.pnl }}</td>

    <td>
      <button @click="emit('edit', trade)">✏️</button>
      <button @click="emit('delete', trade.id)">🗑️</button>
    </td>
  </tr>
</template>
