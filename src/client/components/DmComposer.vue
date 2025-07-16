<!-- OnlyFans Automation Manager
     File: DmComposer.vue
     Purpose: quick DM composer (User Story B-1)
     Last updated: 2025-07-16 -->
<template>
  <div class="dm-composer">
    <h2>Quick DM</h2>

    <form @submit.prevent="send">
      <!-- Fan selection dropdown -->
      <select v-model="fanId">
        <option value="" disabled>Select fan…</option>
        <option v-for="fan in fansList" :key="fan.fan_id" :value="fan.fan_id">
          {{ fan.display_name || ('Fan ' + fan.fan_id) }}
        </option>
      </select>

      <input v-model="text" placeholder="Message" />
      <input v-model="mediaId" placeholder="Media ID (optional)" />
      <button type="submit">Send</button>

      <div v-if="status">{{ status }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

const fanId  = ref('')
const text   = ref('')
const mediaId = ref('')
const status = ref('')

/* --- fetch fans list (first 50) --- */
const { result: fansResult, loading: fansLoading } = useQuery(gql`
  query {
    fans {
      fan_id
      display_name
    }
  }
`)
const fansList = computed(() => fansResult.value?.fans || [])

/* --- form submit handler --- */
async function send () {
  if (!fanId.value || !text.value) {
    status.value = 'Fan and message are required'
    return
  }

  status.value = 'Sending…'
  try {
    const res = await fetch(`/api/fans/${fanId.value}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.value, mediaId: mediaId.value })
    })
    if (!res.ok) throw new Error('Request failed')

    status.value = '✅ Message sent!'
    text.value = ''
    mediaId.value = ''
  } catch (err) {
    console.error(err)
    status.value = '❌ Error sending message'
  }
}
</script>

<style scoped>
.dm-composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dm-composer select,
.dm-composer input,
.dm-composer button {
  padding: 0.4rem;
  font-size: 0.9rem;
}
button {
  cursor: pointer;
}
</style>
<!-- End of File -->
