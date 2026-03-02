<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Stats bar -->
    <AdwStatsBar :stats="stats" />

    <!-- Table -->
    <div class="flex-1 overflow-y-auto">
      <AdwRunTable :runs="runs" @select-run="onSelectRun" />
    </div>

    <!-- Detail panel (slide-in overlay) -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="selectedRunDetail"
        class="fixed inset-0 z-40"
        style="background-color: rgba(0,0,0,0.4)"
        @click="clearDetail"
      />
      <!-- Panel -->
      <AdwRunDetailPanel
        v-if="selectedRunDetail"
        :detail="selectedRunDetail"
        @close="clearDetail"
      />
    </Teleport>

    <!-- Loading indicator -->
    <div
      v-if="loadingDetail"
      class="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg shadow-lg text-sm"
      :style="{ backgroundColor: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)', border: '1px solid var(--theme-border-secondary)' }"
    >
      Loading detail...
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdwData } from '../composables/useAdwData';
import AdwStatsBar from './AdwStatsBar.vue';
import AdwRunTable from './AdwRunTable.vue';
import AdwRunDetailPanel from './AdwRunDetailPanel.vue';

const { runs, stats, selectedRunDetail, loadingDetail, fetchRunDetail, clearDetail } = useAdwData();

const onSelectRun = (adwId: string) => {
  fetchRunDetail(adwId);
};
</script>
