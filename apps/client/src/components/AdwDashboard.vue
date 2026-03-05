<template>
  <div class="adw-dashboard flex flex-col h-full overflow-hidden">
    <!-- Stats bar -->
    <AdwStatsBar :stats="stats" :active-filter="activeFilter" @filter="activeFilter = $event" />

    <!-- Pipeline Progress Summary -->
    <div v-if="stats.total > 0" class="px-5 pb-4">
      <div class="rounded-xl border p-4" style="background: var(--adw-bg-card); border-color: var(--adw-border)">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--adw-text-muted)">Pipeline Progress</span>
          <div class="flex items-center gap-4">
            <div v-if="stats.completed > 0" class="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              <span class="text-xs font-medium" style="color: var(--adw-text-secondary)">Done</span>
              <span class="text-xs font-bold adw-font-number" style="color: var(--adw-text-primary)">{{ stats.completed }}</span>
            </div>
            <div v-if="prMonitoringCount > 0" class="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="text-xs font-medium" style="color: var(--adw-text-secondary)">PR Monitoring</span>
              <span class="text-xs font-bold adw-font-number" style="color: var(--adw-text-primary)">{{ prMonitoringCount }}</span>
            </div>
          </div>
        </div>
        <!-- Progress bar -->
        <div class="adw-progress-track">
          <div
            v-if="stats.completed > 0"
            class="h-full transition-all duration-500"
            :style="{
              width: `${(stats.completed / stats.total) * 100}%`,
              background: 'linear-gradient(90deg, #16a34a, #4ade80)',
              borderRadius: prMonitoringCount > 0 ? '6px 0 0 6px' : '6px',
            }"
          />
          <div
            v-if="prMonitoringCount > 0"
            class="h-full transition-all duration-500"
            :style="{
              width: `${(prMonitoringCount / stats.total) * 100}%`,
              background: 'linear-gradient(90deg, #06b6d4, #67e8f9)',
              borderRadius: stats.completed > 0 ? '0 6px 6px 0' : '6px',
            }"
          />
        </div>
        <!-- Labels removed per design -->
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-y-auto px-5 pb-4">
      <div class="rounded-xl border overflow-hidden" style="background: var(--adw-bg-card); border-color: var(--adw-border)">
        <AdwRunTable :runs="filteredRuns" @select-run="onSelectRun" />
      </div>
    </div>

    <!-- Detail panel (slide-in overlay) -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="selectedRunDetail"
        class="fixed inset-0 z-40"
        style="background-color: rgba(0,0,0,0.5); backdrop-filter: blur(2px)"
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
      style="background: var(--adw-bg-card); color: var(--adw-text-secondary); border: 1px solid var(--adw-border)"
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

const prMonitoringCount = computed(() => {
  return runs.value.filter((r) => r.status === 'pr_monitoring' || r.phase === 'pr_monitoring').length;
});

const filteredRuns = computed(() => {
  if (!activeFilter.value) return runs.value;
  return runs.value.filter((run) => {
    switch (activeFilter.value) {
      case 'done':
        return run.status === 'completed' || run.status === 'pr_merged' || run.status === 'pr_closed' || run.phase === 'done';
      case 'failed':
        return run.status === 'failed';
      case 'blocked':
        return run.is_blocked;
      case 'prs':
        return run.pr_number != null && run.pr_state === 'OPEN';
      case 'active':
        return !(run.status === 'completed' || run.status === 'pr_merged' || run.status === 'pr_closed' || run.phase === 'done')
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
