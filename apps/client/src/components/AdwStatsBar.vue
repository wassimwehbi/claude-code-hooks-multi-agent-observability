<template>
  <div class="flex flex-wrap gap-3 p-3">
    <!-- Metric cards -->
    <button
      v-for="card in cards"
      :key="card.label"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150"
      :style="{
        borderColor: activeFilter === card.filter ? card.color : 'var(--theme-border-secondary)',
        backgroundColor: activeFilter === card.filter ? card.color + '18' : 'var(--theme-bg-tertiary)',
        boxShadow: activeFilter === card.filter ? '0 0 0 1px ' + card.color + '44' : 'none',
      }"
      @click="$emit('filter', activeFilter === card.filter ? null : card.filter)"
    >
      <span class="text-lg">{{ card.icon }}</span>
      <div class="flex flex-col">
        <span
          class="text-xs font-medium"
          :style="{ color: 'var(--theme-text-tertiary)' }"
        >{{ card.label }}</span>
        <span
          class="text-lg font-bold leading-tight"
          :style="{ color: card.color }"
        >{{ card.value }}</span>
      </div>
    </button>

    <!-- Phase distribution mini bar -->
    <div
      v-if="Object.keys(stats.phaseDistribution).length > 0"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[200px]"
      :style="{
        borderColor: 'var(--theme-border-secondary)',
        backgroundColor: 'var(--theme-bg-tertiary)',
      }"
    >
      <span class="text-xs font-medium whitespace-nowrap" :style="{ color: 'var(--theme-text-tertiary)' }">
        Phases
      </span>
      <div class="flex flex-1 h-4 rounded overflow-hidden gap-px">
        <div
          v-for="(count, phase) in stats.phaseDistribution"
          :key="phase"
          class="h-full transition-all duration-300"
          :style="{
            width: `${(count / stats.total) * 100}%`,
            backgroundColor: getPhaseColor(phase as BugPhase),
            minWidth: '4px',
          }"
          :title="`${phase}: ${count}`"
        />
      </div>
    </div>
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
  { label: 'Total', value: props.stats.total, icon: '#', color: 'var(--theme-text-primary)', filter: null as AdwFilter | null },
  { label: 'Active', value: props.stats.active, icon: '>', color: '#3b82f6', filter: 'active' as AdwFilter },
  { label: 'PRs', value: props.stats.activePRs, icon: '!', color: '#10b981', filter: 'prs' as AdwFilter },
  { label: 'Blocked', value: props.stats.blocked, icon: '!', color: '#ef4444', filter: 'blocked' as AdwFilter },
  { label: 'Done', value: props.stats.completed, icon: '*', color: '#22c55e', filter: 'done' as AdwFilter },
  { label: 'Failed', value: props.stats.failed, icon: 'x', color: '#ef4444', filter: 'failed' as AdwFilter },
]);
</script>
