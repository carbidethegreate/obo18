<!-- OnlyFans Automation Manager
     File: AnalyticsDashboard.vue
     Purpose: basic analytics shell
     Created: 2025-07-16 – v1.0 -->
<template>
  <div class="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
    <ProfileVisitors />
    <LtvCard />
    <!-- more analytics widgets soon -->
  </div>
</template>

<script setup>
import ProfileVisitors from './ProfileVisitors.vue'
import LtvCard from './LtvCard.vue'
</script>

<!-- End of File – Last modified 2025-07-20 -->
