<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Stats bar -->
    <AdwStatsBar :stats="stats" :active-filter="activeFilter" @filter="activeFilter = $event" />

    <!-- Table -->
    <div class="flex-1 overflow-y-auto">
      <AdwRunTable :runs="filteredRuns" @select-run="onSelectRun" />
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
import { ref, computed } from 'vue';
import { useAdwData } from '../composables/useAdwData';
import AdwStatsBar from './AdwStatsBar.vue';
import type { AdwFilter } from './AdwStatsBar.vue';
import AdwRunTable from './AdwRunTable.vue';
import AdwRunDetailPanel from './AdwRunDetailPanel.vue';

const { runs, stats, selectedRunDetail, loadingDetail, fetchRunDetail, clearDetail } = useAdwData();

const activeFilter = ref<AdwFilter | null>(null);

const filteredRuns = computed(() => {
  if (!activeFilter.value) return runs.value;
  return runs.value.filter((run) => {
    switch (activeFilter.value) {
      case 'done':
        return run.status === 'completed' || run.status === 'pr_merged' || run.phase === 'done';
      case 'failed':
        return run.status === 'failed';
      case 'blocked':
        return run.is_blocked;
      case 'prs':
        return run.pr_number != null && run.pr_state === 'OPEN';
      case 'active':
        return !(run.status === 'completed' || run.status === 'pr_merged' || run.phase === 'done')
          && run.status !== 'failed'
          && !run.is_blocked
          && !!run.status;
      default:
        return true;
    }
  });
});

const onSelectRun = (adwId: string) => {
  fetchRunDetail(adwId);
};
</script>
