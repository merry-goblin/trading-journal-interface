<script setup>
import ScreenshotRow from "./ScreenshotRow.vue";

defineProps({
  screenshots: Array
})

const emit = defineEmits(['doStuff'])
</script>

<template>
  <table>
    <tbody>
    <ScreenshotRow
        v-for="screenshot in screenshots"
        :key="screenshot.id"
        :screenshot="screenshot"
        @doStuff="emit('doStuff', $event)"
    />
    </tbody>
  </table>
</template>
