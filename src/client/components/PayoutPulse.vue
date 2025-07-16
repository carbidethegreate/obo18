<!-- OnlyFans Automation Manager
     File: PayoutPulse.vue
     Purpose: show payout balance (User Story B-5)
     Last updated: 2025-07-16 -->
<template>
  <div class="payout" :style="{ color: balanceColor }">
    <span v-if="loading">Loading balance...</span>
    <span v-else-if="error">Balance unavailable</span>
    <span v-else>Balance: ${{ balance }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

const { result, loading, error } = useQuery(gql`
  query {
    balances
  }
`)

const balance = computed(() => result.value?.balances ?? 0)
const balanceColor = computed(() => (balance.value >= 500 ? 'orange' : 'black'))
</script>

<style scoped>
.payout {
  font-weight: 600;
  font-size: 1rem;
}
</style>
<!-- End of File -->
