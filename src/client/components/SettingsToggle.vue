<!-- OnlyFans Automation Manager
     File: SettingsToggle.vue
     Purpose: toggle cron jobs (User Stories E-1/E-2)
     Created: 2025-07-06 – v1.0 -->
<template>
  <div class="settings-toggle">
    <h2>Settings</h2>
    <div v-for="(val, key) in settings" :key="key">
      <label>
        <input type="checkbox" v-model="settings[key]" @change="save(key)" />
        {{ formatKey(key) }}
      </label>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

// Helper to prettify setting keys, e.g. "generateRepliesEnabled" -> "Generate Replies"
const formatKey = (key) => {
  return key
    .replace(/Enabled$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase())
}

const settings = reactive({})

onMounted(async () => {
  const res = await fetch('/api/settings')
  if (res.ok) {
    Object.assign(settings, await res.json())
  }
})

async function save(key) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: settings[key] })
  })
}
</script>

<!-- End of File – Last modified 2025-07-06 -->
