<!-- OnlyFans Automation Manager
     File: ContentDashboard.vue
     Purpose: queue + post manager shell
     Created: 2025-07-16 – v1.0 -->
<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Content &amp; Queue</h2>

    <PostManager class="mb-6" />
    <QueueView />
  </div>
</template>

<script setup>
import PostManager from './PostManager.vue'
import QueueView from './QueueView.vue'
</script>

<!-- End of File – Last modified 2025-07-17 -->
