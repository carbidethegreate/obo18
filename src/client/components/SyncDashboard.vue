<template>
  <div>
    <h2 class="text-xl font-semibold mb-2">Data Sync</h2>
    <button class="btn" @click="syncAll" :disabled="busy">
      {{ busy ? 'Syncing…' : 'Sync All' }}
    </button>
    <p v-if="status" class="mt-2">{{ status }}</p>

    <h3 class="text-lg font-semibold mt-6 mb-2">Fans (first 100)</h3>
    <table class="w-full border bg-white">
      <thead><tr class="bg-slate-100">
        <th class="p-2 text-left">Name</th><th class="p-2">User</th>
        <th class="p-2">Status</th><th class="p-2 text-right">Spend $</th>
      </tr></thead>
      <tbody>
        <tr v-for="f in fans" :key="f.fan_id">
          <td class="p-2">{{ f.display_name }}</td>
          <td class="p-2">@{{ f.username }}</td>
          <td class="p-2">{{ f.subscription_status }}</td>
          <td class="p-2 text-right">{{ f.spend_total }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const busy=ref(false), status=ref(''), fans=ref([])

async function syncAll(){
  busy.value=true; status.value='Running sync…'
  const r=await fetch('/api/sync',{method:'POST'})
  busy.value=false; status.value=r.ok?'✅ done':'❌ failed'
  if(r.ok) loadFans()
}
async function loadFans(){
  const r=await fetch('/api/fans?limit=100')
  fans.value=(await r.json()).rows||[]
}
onMounted(loadFans)
</script>

<style scoped>.btn{@apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700}</style>
