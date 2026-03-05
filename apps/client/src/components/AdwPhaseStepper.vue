<template>
  <!-- COMPACT MODE: dots with connectors for table rows -->
  <div v-if="compact" class="flex items-center gap-0.5" :title="currentLabelFull()">
    <template v-for="(phase, index) in BUG_PHASES" :key="phase">
      <div
        class="w-2.5 h-2.5 rounded-full transition-all duration-300 flex-shrink-0"
        :class="{ 'animate-pulse': phaseState(phase) === 'current' && currentPhase !== 'done' }"
        :style="dotStyle(phase)"
        :title="phaseLabel(phase)"
      />
      <div
        v-if="index < BUG_PHASES.length - 1"
        class="w-1 h-0.5 flex-shrink-0"
        :style="{ backgroundColor: index < ci ? 'var(--adw-text-muted, var(--theme-text-tertiary))' : 'var(--adw-border, var(--theme-border-secondary))' }"
      />
    </template>
  </div>

  <!-- FULL MODE: progress bar with step callout + dot stepper -->
  <div v-else class="stepper-full">
    <!-- Current phase callout -->
    <div class="callout">
      <span class="callout-step">
        Step {{ ci + 1 }}<span class="callout-total">/{{ BUG_PHASES.length }}</span>
      </span>
      <span
        class="callout-name"
        :style="{ color: currentPhase ? getPhaseColor(currentPhase) : 'var(--adw-text-muted, var(--theme-text-tertiary))' }"
      >
        {{ currentPhase ? phaseLabel(currentPhase) : '—' }}
      </span>
    </div>

    <!-- Dot stepper (matching Figma panel design) -->
    <div class="flex items-center gap-1 my-2">
      <template v-for="(phase, index) in BUG_PHASES" :key="phase">
        <div
          class="w-3 h-3 rounded-full transition-all duration-300 flex-shrink-0"
          :class="{ 'animate-pulse': phaseState(phase) === 'current' && currentPhase !== 'done' }"
          :style="dotStyle(phase)"
          :title="phaseLabel(phase)"
        />
        <div
          v-if="index < BUG_PHASES.length - 1"
          class="w-1.5 h-0.5 flex-shrink-0"
          :style="{ backgroundColor: index < ci ? 'var(--adw-text-muted, var(--theme-text-tertiary))' : 'var(--adw-border, var(--theme-border-secondary))' }"
        />
      </template>
    </div>

    <!-- Phase labels removed per design -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BugPhase } from '../types/adw';
import { BUG_PHASES } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';

const props = withDefaults(defineProps<{
  currentPhase: BugPhase | null;
  compact?: boolean;
}>(), {
  compact: false,
});

const { getPhaseColor } = useAdwPhaseColors();

const ci = computed(() => {
  if (!props.currentPhase) return -1;
  return BUG_PHASES.indexOf(props.currentPhase);
});

const phaseState = (phase: BugPhase): 'completed' | 'current' | 'future' => {
  const pi = BUG_PHASES.indexOf(phase);
  if (pi < ci.value) return 'completed';
  if (pi === ci.value) return 'current';
  return 'future';
};

const PHASE_LABELS: Record<BugPhase, string> = {
  preflight: 'Preflight',
  investigation: 'Investigate',
  e2e_test_generation: 'E2E Gen',
  design_review: 'Design',
  implementation: 'Implement',
  testing: 'Test',
  code_review: 'Review',
  pr_creation: 'PR',
  feedback_iteration: 'Feedback',
  pr_monitoring: 'Monitor',
  done: 'Done',
};

const phaseLabel = (phase: BugPhase): string => PHASE_LABELS[phase];

const currentLabelFull = (): string => {
  if (!props.currentPhase) return '—';
  return `${ci.value + 1}/${BUG_PHASES.length} ${phaseLabel(props.currentPhase)}`;
};

const dotStyle = (phase: BugPhase) => {
  const state = phaseState(phase);
  const color = getPhaseColor(phase);
  if (state === 'completed') return { backgroundColor: color };
  if (state === 'current') return { backgroundColor: color, boxShadow: `0 0 6px ${color}` };
  return { backgroundColor: 'var(--adw-border, var(--theme-border-secondary))' };
};
</script>

<style scoped>
.stepper-full {
  padding: 2px 0;
}

.callout {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.callout-step {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--adw-text-primary, var(--theme-text-primary));
  font-family: var(--adw-font-number);
}

.callout-total {
  opacity: 0.4;
}

.callout-name {
  font-size: 13px;
  font-weight: 700;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
