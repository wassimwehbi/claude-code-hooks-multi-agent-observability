<template>
  <div class="flex items-center" :class="compact ? 'gap-1' : 'gap-0.5'">
    <template v-for="(phase, index) in BUG_PHASES" :key="phase">
      <!-- Dot -->
      <div class="flex flex-col items-center" :class="compact ? '' : 'min-w-[60px]'">
        <div
          class="rounded-full transition-all duration-300"
          :class="[
            dotSizeClass,
            phaseState(phase) === 'completed' ? '' : '',
            phaseState(phase) === 'current' && props.currentPhase !== 'done' ? 'animate-pulse' : '',
          ]"
          :style="{ backgroundColor: dotColor(phase) }"
          :title="phaseLabel(phase)"
        />
        <!-- Label (full mode only) -->
        <span
          v-if="!compact"
          class="mt-1 text-[10px] text-center leading-tight"
          :style="{ color: phaseState(phase) === 'future' ? 'var(--theme-text-tertiary)' : 'var(--theme-text-secondary)' }"
        >
          {{ phaseLabel(phase) }}
        </span>
      </div>
      <!-- Connector line -->
      <div
        v-if="index < BUG_PHASES.length - 1"
        class="flex-shrink-0"
        :class="compact ? 'w-1 h-0.5' : 'w-3 h-0.5 mb-4'"
        :style="{ backgroundColor: connectorColor(index) }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
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

const currentIndex = () => {
  if (!props.currentPhase) return -1;
  return BUG_PHASES.indexOf(props.currentPhase);
};

const phaseState = (phase: BugPhase): 'completed' | 'current' | 'future' => {
  const ci = currentIndex();
  const pi = BUG_PHASES.indexOf(phase);
  if (pi < ci) return 'completed';
  if (pi === ci) return 'current';
  return 'future';
};

const dotSizeClass = props.compact ? 'w-2 h-2' : 'w-3 h-3';

const dotColor = (phase: BugPhase): string => {
  const state = phaseState(phase);
  if (state === 'future') return 'var(--theme-border-secondary)';
  return getPhaseColor(phase);
};

const connectorColor = (index: number): string => {
  const ci = currentIndex();
  if (index < ci) return 'var(--theme-text-tertiary)';
  return 'var(--theme-border-secondary)';
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
</script>
