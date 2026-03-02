<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center"
      @keydown.escape.prevent="$emit('close')"
      @keydown.left.prevent="prev"
      @keydown.right.prevent="next"
      tabindex="0"
      ref="backdrop"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0"
        style="background-color: rgba(0, 0, 0, 0.85)"
        @click="$emit('close')"
      />

      <!-- Modal -->
      <div
        class="relative z-10 flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style="width: min(90vw, 700px); max-height: min(85vh, 600px)"
        :style="{ backgroundColor: 'var(--theme-bg-secondary)' }"
        @click.stop
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          :style="{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="px-2 py-0.5 rounded text-xs font-bold"
              :style="{ backgroundColor: roleColor + '22', color: roleColor }"
            >{{ roleName }}</span>
            <span class="font-mono font-medium text-sm truncate" :style="{ color: 'var(--theme-text-primary)' }">
              {{ currentAgent.name }}
            </span>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div v-if="agents.length > 1" class="flex items-center gap-1">
              <button
                class="px-2 py-0.5 rounded text-xs hover:bg-[var(--theme-bg-quaternary)] transition-colors"
                :style="{ color: 'var(--theme-text-secondary)' }"
                @click="prev"
                aria-label="Previous agent"
              >&lt;</button>
              <span class="text-xs" :style="{ color: 'var(--theme-text-tertiary)' }">
                {{ currentIndex + 1 }}/{{ agents.length }}
              </span>
              <button
                class="px-2 py-0.5 rounded text-xs hover:bg-[var(--theme-bg-quaternary)] transition-colors"
                :style="{ color: 'var(--theme-text-secondary)' }"
                @click="next"
                aria-label="Next agent"
              >&gt;</button>
            </div>
            <button
              class="px-2 py-0.5 rounded text-sm hover:bg-[var(--theme-bg-quaternary)] transition-colors"
              :style="{ color: 'var(--theme-text-secondary)' }"
              @click="$emit('close')"
              aria-label="Close"
            >x</button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <!-- Error banner -->
          <div
            v-if="currentAgent.isError"
            class="px-3 py-2 rounded-lg text-xs font-medium"
            :style="{ backgroundColor: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }"
          >
            Agent failed{{ currentAgent.stopReason ? ` — ${currentAgent.stopReason}` : '' }}
          </div>

          <!-- Primary metrics -->
          <div class="grid grid-cols-3 gap-3">
            <MetricCard label="Cost" :value="currentAgent.costUsd != null ? `$${currentAgent.costUsd.toFixed(2)}` : '-'" />
            <MetricCard label="Duration" :value="currentAgent.durationMs != null ? formatDuration(currentAgent.durationMs) : '-'" />
            <MetricCard label="Model" :value="currentAgent.model ? formatModel(currentAgent.model) : '-'" />
          </div>

          <!-- Secondary metrics -->
          <div class="grid grid-cols-4 gap-3">
            <MetricCard label="Turns" :value="currentAgent.numTurns != null ? String(currentAgent.numTurns) : '-'" />
            <MetricCard label="Output Tokens" :value="currentAgent.outputTokens != null ? formatNumber(currentAgent.outputTokens) : '-'" />
            <MetricCard label="Cache Read" :value="currentAgent.cacheReadTokens != null ? formatNumber(currentAgent.cacheReadTokens) : '-'" />
            <MetricCard label="File Size" :value="formatBytes(currentAgent.outputSizeBytes)" />
          </div>

          <!-- Timing breakdown -->
          <div v-if="currentAgent.durationMs != null && currentAgent.durationApiMs != null">
            <div class="text-[10px] uppercase tracking-wider mb-1.5" :style="{ color: 'var(--theme-text-tertiary)' }">
              Time Breakdown
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-3 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--theme-bg-quaternary)' }">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${(currentAgent.durationApiMs / currentAgent.durationMs) * 100}%`,
                    backgroundColor: '#3b82f6',
                  }"
                />
              </div>
              <span class="text-[10px] font-mono whitespace-nowrap" :style="{ color: 'var(--theme-text-tertiary)' }">
                API: {{ formatDuration(currentAgent.durationApiMs) }} / Total: {{ formatDuration(currentAgent.durationMs) }}
              </span>
            </div>
          </div>

          <!-- Prompt / command -->
          <div v-if="currentAgent.prompt">
            <div class="text-[10px] uppercase tracking-wider mb-1.5" :style="{ color: 'var(--theme-text-tertiary)' }">
              Command
            </div>
            <div
              class="p-3 rounded-lg border font-mono text-xs whitespace-pre-wrap break-all"
              :style="{
                borderColor: 'var(--theme-border-secondary)',
                backgroundColor: 'var(--theme-bg-tertiary)',
                color: 'var(--theme-text-secondary)',
              }"
            >{{ currentAgent.prompt }}</div>
          </div>

          <!-- Start time -->
          <div class="text-xs" :style="{ color: 'var(--theme-text-tertiary)' }">
            Started: {{ formatTime(currentAgent.startedAt) }}
          </div>

          <!-- Pipeline position -->
          <div>
            <div class="text-[10px] uppercase tracking-wider mb-1.5" :style="{ color: 'var(--theme-text-tertiary)' }">
              Pipeline Position
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(agent, i) in agents"
                :key="agent.name"
                class="px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer"
                :style="{
                  backgroundColor: i === currentIndex ? 'var(--theme-primary)' + '33' : 'var(--theme-bg-tertiary)',
                  color: i === currentIndex ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                  border: '1px solid ' + (i === currentIndex ? 'var(--theme-primary)' : 'var(--theme-border-tertiary)'),
                }"
                @click="currentIndex = i"
              >
                {{ i + 1 }}. {{ agent.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { h, ref, computed, watch, nextTick } from 'vue';
import type { AgentArtifact } from '../types/adw';

const props = defineProps<{
  isOpen: boolean;
  agents: AgentArtifact[];
  startIndex?: number;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const currentIndex = ref(props.startIndex ?? 0);
const backdrop = ref<HTMLElement | null>(null);

const currentAgent = computed(() => props.agents[currentIndex.value] ?? props.agents[0]);

// Role color based on agent name prefix
const ROLE_COLORS: Record<string, string> = {
  investigator: '#8b5cf6',
  reviewer: '#3b82f6',
  implementer: '#f59e0b',
  test_runner: '#f97316',
  e2e: '#a78bfa',
  code_reviewer: '#06b6d4',
  pr_creator: '#10b981',
  pr_feedback: '#ec4899',
};

const roleName = computed(() => {
  const name = currentAgent.value.name;
  if (name.startsWith('investigator')) return 'Investigate';
  if (name.startsWith('reviewer')) return 'Design Review';
  if (name.startsWith('implementer')) return 'Implement';
  if (name.startsWith('test_runner')) return 'Test';
  if (name.startsWith('e2e_test_generator')) return 'E2E Generate';
  if (name.startsWith('e2e_before_runner')) return 'E2E Baseline';
  if (name.startsWith('e2e_runner')) return 'E2E Run';
  if (name.startsWith('e2e_resolver')) return 'E2E Resolve';
  if (name.startsWith('code_reviewer')) return 'Code Review';
  if (name.startsWith('pr_creator')) return 'PR Create';
  if (name.startsWith('pr_feedback_categorizer')) return 'Categorize FB';
  if (name.startsWith('pr_feedback_fixer')) return 'Fix FB';
  return name;
});

const roleColor = computed(() => {
  const name = currentAgent.value.name;
  for (const [prefix, color] of Object.entries(ROLE_COLORS)) {
    if (name.startsWith(prefix)) return color;
  }
  return '#6b7280';
});

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.agents.length) % props.agents.length;
};

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.agents.length;
};

watch(() => props.isOpen, (open) => {
  if (open) {
    currentIndex.value = props.startIndex ?? 0;
    nextTick(() => backdrop.value?.focus());
  }
});

watch(() => props.startIndex, (v) => {
  if (v != null) currentIndex.value = v;
});

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (ms: number): string => {
  if (!ms) return '-';
  const d = new Date(ms);
  return d.toLocaleTimeString();
};

const formatDuration = (ms: number): string => {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatModel = (m: string): string => {
  // "claude-opus-4-6" → "Opus 4.6"
  const match = m.match(/claude-(\w+)-(\d+)-(\d+)/);
  if (match) return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2]}.${match[3]}`;
  return m;
};

// Functional metric card sub-component
const MetricCard = (cardProps: { label: string; value: string }) =>
  h('div', {
    class: 'rounded-lg border p-3',
    style: { borderColor: 'var(--theme-border-secondary)', backgroundColor: 'var(--theme-bg-tertiary)' },
  }, [
    h('div', {
      class: 'text-[10px] uppercase tracking-wider mb-1',
      style: { color: 'var(--theme-text-tertiary)' },
    }, cardProps.label),
    h('div', {
      class: 'text-sm font-mono',
      style: { color: 'var(--theme-text-primary)' },
    }, cardProps.value),
  ]);
</script>
