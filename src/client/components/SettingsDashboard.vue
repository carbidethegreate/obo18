<template>
  <div class="space-y-6">
    <SettingsToggle />
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-semibold mb-2">API Keys</h3>
      <p>OnlyFans Key: <code>••••••</code></p>
      <p>OpenAI Key: <code>••••••</code></p>
      <a href="http://localhost:4000/admin.html"
         class="text-blue-600 underline">Edit keys in Admin panel</a>
    </div>
  </div>
</template>
<script setup>
import SettingsToggle from './SettingsToggle.vue'
</script>
