<template>
  <div class="flex h-screen font-sans">
    <aside class="w-56 bg-slate-800 text-white p-4 space-y-2">
      <h1 class="text-lg font-bold mb-4">OFA Manager</h1>
      <button v-for="item in items" :key="item.id"
              :class="buttonClass(item.id)"
              @click="current = item.id">
        {{ item.label }}
      </button>
    </aside>

    <main class="flex-1 overflow-y-auto p-6 bg-slate-50">
      <component :is="pageMap[current]" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SyncPage      from './views/Sync.vue'
import MessagingPage from './views/Messaging.vue'
import ContentPage   from './views/Content.vue'
import EarningsPage  from './views/Earnings.vue'
import AnalyticsPage from './views/Analytics.vue'
import SettingsPage  from './views/Settings.vue'

const items = [
  { id: 'sync',      label: 'Sync & Fans' },
  { id: 'messages',  label: 'Messages' },
  { id: 'content',   label: 'Content & Queue' },
  { id: 'earnings',  label: 'Earnings' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings',  label: 'Settings' }
]
const pageMap = { sync:SyncPage, messages:MessagingPage, content:ContentPage,
                  earnings:EarningsPage, analytics:AnalyticsPage, settings:SettingsPage }
const current = ref('sync')
const buttonClass = id => 'w-full text-left px-3 py-2 rounded ' +
  (current.value===id? 'bg-slate-700':'hover:bg-slate-700/60')
</script>
