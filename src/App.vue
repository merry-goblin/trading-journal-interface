<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'

const route = useRoute()
const isPublic = computed(() => route.meta.public)
</script>

<template>
  <div v-if="isPublic" class="public-layout">
    <router-view />
  </div>
  <div v-else class="app-layout">
    <AppNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
