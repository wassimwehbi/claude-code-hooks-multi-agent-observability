<template>
  <!-- ═══ COMPACT MODE: dots with connectors for table rows ═══ -->
  <div v-if="compact" class="flex items-center gap-1" :title="currentLabelFull()">
    <template v-for="(phase, index) in BUG_PHASES" :key="phase">
      <div class="flex flex-col items-center">
        <div
          class="w-2 h-2 rounded-full transition-all duration-300"
          :class="{ 'animate-pulse': phaseState(phase) === 'current' && currentPhase !== 'done' }"
          :style="dotStyle(phase)"
          :title="phaseLabel(phase)"
        />
      </div>
      <div
        v-if="index < BUG_PHASES.length - 1"
        class="w-1 h-0.5 flex-shrink-0"
        :style="{ backgroundColor: index < ci ? 'var(--theme-text-tertiary)' : 'var(--theme-border-secondary)' }"
      />
    </template>
  </div>

  <!-- ═══ FULL MODE: progress bar with phase callout ═══ -->
  <div v-else class="stepper-full">
    <!-- Current phase callout -->
    <div class="callout">
      <span class="callout-step" :style="{ color: 'var(--theme-text-tertiary)' }">
        Step {{ ci + 1 }}<span class="callout-total">/{{ BUG_PHASES.length }}</span>
      </span>
      <span
        class="callout-name"
        :style="{ color: currentPhase ? getPhaseColor(currentPhase) : 'var(--theme-text-tertiary)' }"
      >
        <span
          v-if="currentPhase && currentPhase !== 'done'"
          class="callout-dot"
          :style="{ backgroundColor: getPhaseColor(currentPhase) }"
        />
        {{ currentPhase ? phaseLabel(currentPhase) : '—' }}
      </span>
    </div>

    <!-- Segmented track -->
    <div class="full-track">
      <div
        v-for="(phase, index) in BUG_PHASES"
        :key="phase"
        class="full-seg-wrapper"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = null"
      >
        <div
          class="full-seg"
          :class="{
            'full-seg--pulse': phaseState(phase) === 'current' && currentPhase !== 'done',
          }"
          :style="fullSegStyle(phase)"
        />
        <!-- Tooltip on hover -->
        <div v-if="hoveredIndex === index" class="seg-tooltip" :style="tooltipAlign(index)">
          {{ phaseLabel(phase) }}
        </div>
      </div>
    </div>

    <!-- Phase labels: first, current, last -->
    <div class="phase-markers">
      <span class="marker marker--start" :style="{ color: 'var(--theme-text-tertiary)' }">
        {{ phaseLabel(BUG_PHASES[0]) }}
      </span>
      <span class="marker marker--end" :style="{ color: 'var(--theme-text-tertiary)' }">
        {{ phaseLabel(BUG_PHASES[BUG_PHASES.length - 1]) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

const hoveredIndex = ref<number | null>(null);

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

/* ── Compact dot style ── */
const dotStyle = (phase: BugPhase) => {
  const state = phaseState(phase);
  const color = getPhaseColor(phase);
  if (state === 'completed') return { backgroundColor: color };
  if (state === 'current') return { backgroundColor: color, boxShadow: `0 0 4px ${color}` };
  return { backgroundColor: 'var(--theme-border-secondary)' };
};

/* ── Full segment style ── */
const fullSegStyle = (phase: BugPhase) => {
  const state = phaseState(phase);
  const color = getPhaseColor(phase);
  if (state === 'completed') return { backgroundColor: color, opacity: '0.6' };
  if (state === 'current') return { backgroundColor: color, boxShadow: `0 0 6px ${color}` };
  return { backgroundColor: 'var(--theme-border-secondary)', opacity: '0.2' };
};

/* ── Tooltip alignment: keep tooltip within bounds ── */
const tooltipAlign = (index: number) => {
  const total = BUG_PHASES.length;
  if (index <= 1) return { left: '0', transform: 'none' };
  if (index >= total - 2) return { right: '0', transform: 'none' };
  return { left: '50%', transform: 'translateX(-50%)' };
};
</script>

<style scoped>
/* ═══════════════════════════════════════════
   FULL MODE — bar with callout
   ═══════════════════════════════════════════ */
.stepper-full {
  padding: 2px 0;
}

/* ── Current phase callout ── */
.callout {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.callout-step {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.callout-total {
  opacity: 0.5;
}

.callout-name {
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.callout-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

/* ── Segmented track ── */
.full-track {
  display: flex;
  gap: 2px;
  height: 10px;
}

.full-seg-wrapper {
  flex: 1;
  position: relative;
}

.full-seg {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.full-seg--pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* ── Hover tooltip ── */
.seg-tooltip {
  position: absolute;
  top: -26px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--theme-bg-primary, #1a1a2e);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border-secondary);
  pointer-events: none;
  z-index: 10;
}

/* ── Start/end markers ── */
.phase-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
}

.marker {
  font-size: 9px;
  opacity: 0.6;
}

/* ═══════════════════════════════════════════
   ANIMATION
   ═══════════════════════════════════════════ */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
