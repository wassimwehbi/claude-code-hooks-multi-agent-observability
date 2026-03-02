<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm" :style="{ color: 'var(--theme-text-primary)' }">
      <thead>
        <tr
          class="border-b text-left"
          :style="{ borderColor: 'var(--theme-border-secondary)' }"
        >
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap"
            :style="{ color: 'var(--theme-text-secondary)' }"
            @click="toggleSort(col.key)"
          >
            {{ col.label }}
            <span v-if="sortKey === col.key" class="ml-0.5">{{ sortAsc ? '↑' : '↓' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="run in sortedRuns"
          :key="run.adw_id"
          class="border-b cursor-pointer transition-colors duration-150"
          :style="{
            borderColor: 'var(--theme-border-tertiary)',
          }"
          @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-bg-tertiary)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
          @click="$emit('select-run', run.adw_id)"
        >
          <!-- Bug # -->
          <td class="px-3 py-2 font-mono font-bold">
            <a
              v-if="run.bug_number != null"
              :href="`${GITHUB_REPO_URL}/issues/${run.bug_number}`"
              target="_blank"
              rel="noopener"
              class="underline decoration-dotted hover:decoration-solid"
              :style="{ color: 'var(--theme-primary)' }"
              @click.stop
            >#{{ run.bug_number }}</a>
            <span v-else>-</span>
          </td>
          <!-- Title -->
          <td class="px-3 py-2 max-w-[250px] truncate" :title="run.issue_title || ''">
            {{ run.issue_title || run.adw_id }}
          </td>
          <!-- Phase stepper -->
          <td class="px-3 py-2">
            <AdwPhaseStepper :current-phase="run.phase" compact />
          </td>
          <!-- Status -->
          <td class="px-3 py-2">
            <div class="flex items-center gap-1.5">
              <AdwStatusBadge v-if="run.status" :status="run.status" />
              <span v-else :style="{ color: 'var(--theme-text-tertiary)' }">-</span>
              <span
                v-if="run.is_blocked"
                class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style="background-color: #ef4444"
                :title="run.blockers[0] || 'Blocked'"
              />
            </div>
          </td>
          <!-- PR # -->
          <td class="px-3 py-2 font-mono">
            <a
              v-if="run.pr_number != null"
              :href="`${GITHUB_REPO_URL}/pull/${run.pr_number}`"
              target="_blank"
              rel="noopener"
              class="underline decoration-dotted hover:decoration-solid"
              :style="{ color: 'var(--theme-primary)' }"
              @click.stop
            >#{{ run.pr_number }}</a>
            <span v-else>-</span>
          </td>
          <!-- PR State -->
          <td class="px-3 py-2">
            <span
              v-if="run.pr_state"
              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ color: getPrStateColor(run.pr_state), backgroundColor: getPrStateColor(run.pr_state) + '22' }"
            >
              {{ run.pr_state }}
            </span>
            <span v-else :style="{ color: 'var(--theme-text-tertiary)' }">-</span>
          </td>
          <!-- Iterations -->
          <td class="px-3 py-2 text-center font-mono">
            {{ run.pr_monitoring_iterations }}
          </td>
          <!-- Last Updated -->
          <td class="px-3 py-2 whitespace-nowrap" :style="{ color: 'var(--theme-text-tertiary)' }">
            {{ formatRelativeTime(run.last_pr_check_at) }}
          </td>
        </tr>
        <tr v-if="sortedRuns.length === 0">
          <td
            :colspan="columns.length"
            class="px-3 py-8 text-center"
            :style="{ color: 'var(--theme-text-tertiary)' }"
          >
            No ADW runs found
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AdwRunSummary } from '../types/adw';
import { BUG_PHASES } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';
import { GITHUB_REPO_URL } from '../config';

const phaseOrder = new Map(BUG_PHASES.map((p, i) => [p, i]));
import AdwPhaseStepper from './AdwPhaseStepper.vue';
import AdwStatusBadge from './AdwStatusBadge.vue';

const props = defineProps<{
  runs: AdwRunSummary[];
}>();

defineEmits<{
  (e: 'select-run', adwId: string): void;
}>();

const { getPrStateColor } = useAdwPhaseColors();

const columns = [
  { key: 'bug_number', label: 'Bug #' },
  { key: 'issue_title', label: 'Title' },
  { key: 'phase', label: 'Phase' },
  { key: 'status', label: 'Status' },
  { key: 'pr_number', label: 'PR #' },
  { key: 'pr_state', label: 'PR State' },
  { key: 'pr_monitoring_iterations', label: 'Iter' },
  { key: 'last_pr_check_at', label: 'Updated' },
];

const sortKey = ref<string>('bug_number');
const sortAsc = ref(false);

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
};

const sortedRuns = computed(() => {
  const sorted = [...props.runs].sort((a, b) => {
    const key = sortKey.value;

    // Phase column: sort by pipeline ordinal instead of alphabetically
    if (key === 'phase') {
      const aIdx = a.phase != null ? (phaseOrder.get(a.phase) ?? -1) : -1;
      const bIdx = b.phase != null ? (phaseOrder.get(b.phase) ?? -1) : -1;
      return sortAsc.value ? aIdx - bIdx : bIdx - aIdx;
    }

    const aVal = (a as any)[key];
    const bVal = (b as any)[key];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc.value ? aVal - bVal : bVal - aVal;
    }
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortAsc.value ? cmp : -cmp;
  });
  return sorted;
});

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '-';
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};
</script>
