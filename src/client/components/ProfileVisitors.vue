<!-- OnlyFans Automation Manager
     File: ProfileVisitors.vue
     Purpose: show profile visitor count (Reach statistics)
     Created: 2025-07-06 – v1.0 -->

<template>
  <div class="bg-white p-4 rounded shadow">
    <h3 class="font-semibold mb-2">Profile Visitors&nbsp;(30 d)</h3>

    <p v-if="loading">Loading…</p>
    <p v-else>{{ count }} visitors</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const count   = ref(0)

onMounted(async () => {
  try {
    const r = await fetch('/api/profile-visitors')
    count.value = (await r.json()).count ?? 0
  } catch (e) {
    count.value = 0
  } finally {
    loading.value = false
  }
})
</script>

<!-- End of File – Last modified 2025-07-16 -->
