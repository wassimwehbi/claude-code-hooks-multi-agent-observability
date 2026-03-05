<template>
  <div class="overflow-x-auto">
    <table class="w-full adw-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-left cursor-pointer"
            @click="toggleSort(col.key)"
          >
            {{ col.label }}
            <span v-if="sortKey === col.key" class="ml-0.5 opacity-60">{{ sortAsc ? '↑' : '↓' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="run in sortedRuns"
          :key="run.adw_id"
          class="cursor-pointer transition-colors duration-100"
          @click="$emit('select-run', run.adw_id)"
        >
          <!-- Bug # -->
          <td>
            <a
              v-if="run.bug_number != null"
              :href="`${GITHUB_REPO_URL}/issues/${run.bug_number}`"
              target="_blank"
              rel="noopener"
              class="font-mono font-bold hover:underline"
              style="color: var(--adw-accent-cyan)"
              @click.stop
            >#{{ run.bug_number }}</a>
            <span v-else style="color: var(--adw-text-muted)">-</span>
          </td>
          <!-- Title -->
          <td class="max-w-[300px]">
            <div class="flex items-center gap-2">
              <span class="truncate" style="color: var(--adw-text-primary)">{{ run.issue_title || run.adw_id }}</span>
              <span
                v-if="run.is_ux_bug"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                style="color: #a78bfa; background: #a78bfa18; border: 1px solid #a78bfa33"
              >ux</span>
            </div>
          </td>
          <!-- Phase stepper -->
          <td>
            <AdwPhaseStepper :current-phase="run.phase" compact />
          </td>
          <!-- Status -->
          <td>
            <div class="flex items-center gap-1.5">
              <AdwStatusBadge v-if="run.status" :status="run.status" />
              <span v-else style="color: var(--adw-text-muted)">-</span>
              <span
                v-if="run.is_blocked"
                class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style="background-color: #f87171"
                :title="run.blockers[0] || 'Blocked'"
              />
            </div>
          </td>
          <!-- PR # -->
          <td class="font-mono">
            <a
              v-if="run.pr_number != null"
              :href="run.pr_url || `${GITHUB_REPO_URL}/pull/${run.pr_number}`"
              target="_blank"
              rel="noopener"
              class="hover:underline"
              style="color: var(--adw-accent-cyan)"
              @click.stop
            >#{{ run.pr_number }}</a>
            <span v-else style="color: var(--adw-text-muted)">-</span>
          </td>
          <!-- PR State -->
          <td>
            <span
              v-if="run.pr_state"
              class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
              :style="prStateBadgeStyle(run.pr_state)"
            >
              {{ run.pr_state }}
            </span>
            <span v-else style="color: var(--adw-text-muted)">-</span>
          </td>
          <!-- Iterations -->
          <td class="text-center">
            <span
              v-if="run.pr_monitoring_iterations > 0"
              class="font-mono font-bold adw-font-number"
              style="color: var(--adw-text-primary)"
            >{{ run.pr_monitoring_iterations }}</span>
            <span v-else style="color: var(--adw-text-muted)">&mdash;</span>
          </td>
          <!-- Last Updated -->
          <td>
            <span style="color: var(--adw-text-muted)">{{ formatRelativeTime(run.last_pr_check_at) }}</span>
          </td>
        </tr>
        <tr v-if="sortedRuns.length === 0">
          <td
            :colspan="columns.length"
            class="px-4 py-12 text-center"
            style="color: var(--adw-text-muted)"
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

const prStateBadgeStyle = (state: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    OPEN: { bg: '#34d39918', text: '#34d399' },
    MERGED: { bg: '#a78bfa18', text: '#a78bfa' },
    CLOSED: { bg: '#f8717118', text: '#f87171' },
  };
  const c = colors[state] || { bg: '#505872', text: '#8b93a8' };
  return { backgroundColor: c.bg, color: c.text, border: `1px solid ${c.text}33` };
};

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
