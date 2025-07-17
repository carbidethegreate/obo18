<!-- OnlyFans Automation Manager
     File: ActivityLog.vue
     Purpose: display real-time sync log
     Created: 2025-07-17 – v1.0 -->
<template>
  <pre ref="logBox" class="bg-slate-100 text-sm font-mono p-2 h-72 overflow-y-auto whitespace-pre-wrap">{{ logText }}</pre>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const logText = ref('')
const logBox = ref(null)
let timer

async function fetchLog() {
  const res = await fetch('/api/log')
  if (res.ok) {
    const data = await res.json()
    logText.value = Array.isArray(data.log) ? data.log.join('\n') : (data.log || '')
    await nextTick()
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
  }
}

onMounted(() => {
  fetchLog()
  timer = setInterval(fetchLog, 2000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<!-- End of File – Last modified 2025-07-17 -->
