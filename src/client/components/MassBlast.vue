<!-- OnlyFans Automation Manager
     File: MassBlast.vue
     Purpose: mass DM wizard (User Story B-2)
     Created: 2025‑07‑06 – v1.0 -->
<template>
  <div class="mass-blast">
    <h2>Mass Message</h2>
    <form @submit.prevent="send">
      <textarea v-model="text" placeholder="Message"></textarea>
      <input v-model="mediaId" placeholder="Media ID (optional)" />
      <input v-model="scheduled" placeholder="ISO schedule time (optional)" />
      <button type="submit">Send</button>
    </form>
    <div v-if="status">{{ status }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref('')
const mediaId = ref('')
const scheduled = ref('')
const status = ref('')

async function send() {
  if (!text.value) {
    status.value = 'Message text is required'
    return;
  }
  status.value = 'Sending...'
  const body = {
    userLists: ['fans'],
    text: text.value,
    mediaFiles: mediaId.value ? [mediaId.value] : [],
    scheduledDate: scheduled.value || null
  }
  try {
    const res = await fetch('/api/mass-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    status.value = res.ok ? '✅ Bulk message sent!' : '❌ Failed to send'
    // Optionally, clear the form on success
    if (res.ok) {
      text.value = ''
      mediaId.value = ''
      scheduled.value = ''
    }
  } catch (err) {
    console.error(err)
    status.value = '❌ Error sending mass message'
  }
}
</script>

<!-- End of File – Last modified 2025‑07‑06 -->
