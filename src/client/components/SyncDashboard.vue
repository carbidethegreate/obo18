<!-- OnlyFans Automation Manager
     File: SyncDashboard.vue
     Purpose: manual and incremental data sync UI
     Created: 2025-07-06 – v1.0 -->
<template>
  <div>
    <h2 class="text-xl font-semibold mb-2">Data Sync</h2>
    <button class="btn" @click="syncAll()" :disabled="busy">
      {{ busy ? 'Syncing…' : 'Sync All' }}
    </button>
    <button class="btn" style="margin-left:0.5rem" @click="syncAll(10)" :disabled="busy">
      {{ busy ? 'Syncing…' : 'Sync 10' }}
    </button>
    <p v-if="status" class="mt-2">{{ status }}</p>

    <h3 class="text-lg font-semibold mt-6 mb-2">Fans (first 100)</h3>
      <table class="w-full border bg-white">
        <thead><tr class="bg-slate-100">
          <th class="p-2 text-left">Name</th>
          <th class="p-2">User</th>
          <th class="p-2">Status</th>
          <th class="p-2 text-right">Spend $</th>
          <th class="p-2">Actions</th>
        </tr></thead>
        <tbody>
          <tr v-for="f in fans" :key="f.fan_id">
            <td class="p-2">{{ f.display_name }}</td>
            <td class="p-2">@{{ f.username }}</td>
            <td class="p-2">{{ f.subscription_status }}</td>
            <td class="p-2 text-right">{{ f.spend_total }}</td>
            <td class="p-2 text-center">
              <button class="btn btn-sm" :disabled="refreshing===f.fan_id" @click="refreshFan(f.fan_id)">
                {{ refreshing===f.fan_id ? '...' : '🔄' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

    <h3 class="text-lg font-semibold mt-6 mb-2">Activity Log</h3>
    <ActivityLog />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ActivityLog from './ActivityLog.vue'
const busy=ref(false), status=ref(''), fans=ref([]), refreshing=ref(null)

async function syncAll(max){
  busy.value=true; status.value='Running sync…'
  const url=max?`/api/sync?max=${max}`:'/api/sync'
  const r=await fetch(url,{method:'POST'})
  busy.value=false; status.value=r.ok?'✅ done':'❌ failed'
  if(r.ok) loadFans()
}
async function refreshFan(id){
  refreshing.value=id; status.value='Refreshing…'
  const r=await fetch(`/api/fans/${id}/sync`,{method:'POST'})
  refreshing.value=null; status.value=r.ok?'✅ refreshed':'❌ failed'
  if(r.ok) loadFans()
}
async function loadFans(){
  const r=await fetch('/api/fans?limit=100')
  fans.value=(await r.json()).rows||[]
}
onMounted(loadFans)
</script>

<style scoped>
.btn{@apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700}
.btn-sm{@apply px-2 py-1 text-sm}
</style>

<!-- End of File – Last modified 2025-07-17 -->
