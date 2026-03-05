<template>
  <div class="flex flex-wrap gap-3 px-5 py-4">
    <button
      v-for="card in cards"
      :key="card.label"
      class="adw-stat-card flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 min-w-[150px]"
      :style="{
        borderColor: activeFilter === card.filter ? card.color : 'var(--adw-border)',
        backgroundColor: activeFilter === card.filter ? card.color + '12' : 'var(--adw-bg-card)',
        boxShadow: activeFilter === card.filter ? '0 0 0 1px ' + card.color + '33' : 'none',
      }"
      @click="$emit('filter', activeFilter === card.filter ? null : card.filter)"
    >
      <!-- Icon circle -->
      <div
        class="adw-stat-icon"
        :style="{ backgroundColor: card.color + '18', color: card.color }"
      >
        <svg v-if="card.icon === 'hash'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>
        <svg v-else-if="card.icon === 'zap'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <svg v-else-if="card.icon === 'git-pr'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>
        <svg v-else-if="card.icon === 'shield'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <svg v-else-if="card.icon === 'check'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        <svg v-else-if="card.icon === 'x-circle'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      </div>
      <!-- Text -->
      <div class="flex flex-col">
        <span class="text-xs font-medium" style="color: var(--adw-text-muted)">{{ card.label.toUpperCase() }}</span>
        <span
          class="text-2xl font-bold leading-tight adw-font-number"
          style="color: var(--adw-text-primary)"
        >{{ card.value }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AdwStats, BugPhase } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';

export type AdwFilter = 'active' | 'prs' | 'blocked' | 'done' | 'failed';

const props = defineProps<{
  stats: AdwStats;
  activeFilter: AdwFilter | null;
}>();

defineEmits<{
  (e: 'filter', filter: AdwFilter | null): void;
}>();

const { getPhaseColor } = useAdwPhaseColors();

const cards = computed(() => [
  { label: 'Total', value: props.stats.total, icon: 'hash', color: '#5b7fff', filter: null as AdwFilter | null },
  { label: 'Active', value: props.stats.active, icon: 'zap', color: '#34d399', filter: 'active' as AdwFilter },
  { label: 'PRs', value: props.stats.activePRs, icon: 'git-pr', color: '#a78bfa', filter: 'prs' as AdwFilter },
  { label: 'Blocked', value: props.stats.blocked, icon: 'shield', color: '#f87171', filter: 'blocked' as AdwFilter },
  { label: 'Done', value: props.stats.completed, icon: 'check', color: '#34d399', filter: 'done' as AdwFilter },
  { label: 'Failed', value: props.stats.failed, icon: 'x-circle', color: '#f87171', filter: 'failed' as AdwFilter },
]);
</script>

<style scoped>
.adw-stat-card:hover {
  background-color: var(--adw-bg-card-hover) !important;
  border-color: var(--adw-border-light) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
