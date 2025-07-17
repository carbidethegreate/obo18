<!-- OnlyFans Automation Manager
     File: MessagingDashboard.vue
     Purpose: shell for DMs inbox / composer
     Created: 2025-07-16 – v1.0 -->
<template>
  <div class="p-4 space-y-6">
    <h2 class="text-xl font-semibold mb-4">Messages</h2>

    <div>
      <DmComposer />
    </div>

    <hr />

    <div>
      <MassBlast />
    </div>
  </div>
</template>

<script setup>
import DmComposer from './DmComposer.vue'
import MassBlast from './MassBlast.vue'
</script>

<!-- End of File – Last modified 2025-07-17 -->
