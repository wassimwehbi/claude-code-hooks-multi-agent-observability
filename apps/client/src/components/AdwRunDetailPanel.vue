<template>
  <div
    class="fixed inset-y-0 right-0 w-[600px] max-w-full z-50 flex flex-col shadow-2xl transition-transform duration-300"
    :style="{ backgroundColor: 'var(--theme-bg-secondary)', borderLeft: '1px solid var(--theme-border-primary)' }"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 border-b"
      :style="{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
    >
      <div class="flex items-center gap-2 min-w-0">
        <a
          v-if="detail.bug_number != null"
          :href="`${GITHUB_REPO_URL}/issues/${detail.bug_number}`"
          target="_blank"
          rel="noopener"
          class="font-bold text-lg underline decoration-dotted hover:decoration-solid"
          :style="{ color: 'var(--theme-primary)' }"
        >Bug #{{ detail.bug_number }}</a>
        <span v-else class="font-bold text-lg" :style="{ color: 'var(--theme-text-primary)' }">
          {{ detail.adw_id }}
        </span>
        <AdwStatusBadge v-if="detail.status" :status="detail.status" />
      </div>
      <button
        class="p-1 rounded hover:bg-[var(--theme-bg-quaternary)] transition-colors text-lg"
        :style="{ color: 'var(--theme-text-secondary)' }"
        @click="$emit('close')"
        title="Close"
      >
        x
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- Title -->
      <div v-if="detail.issue_title">
        <h3 class="text-base font-semibold" :style="{ color: 'var(--theme-text-primary)' }">
          {{ detail.issue_title }}
        </h3>
      </div>

      <!-- Full phase stepper -->
      <div>
        <SectionLabel>Pipeline Progress</SectionLabel>
        <AdwPhaseStepper :current-phase="detail.phase" />
      </div>

      <!-- Attempt progress bars -->
      <div>
        <SectionLabel>Circuit Breaker Status</SectionLabel>
        <div class="space-y-2">
          <ProgressRow label="Implementation" :value="detail.implementation_attempts" :max="limits.max_implementation_attempts" />
          <ProgressRow label="Review rounds" :value="detail.review_rounds" :max="limits.max_review_rounds" />
          <ProgressRow label="Test retries" :value="detail.test_retry_attempts" :max="limits.max_test_retry_attempts" />
          <ProgressRow label="E2E retries" :value="detail.e2e_test_retry_attempts" :max="limits.max_e2e_test_retry_attempts" />
          <ProgressRow label="PR monitoring" :value="detail.pr_monitoring_iterations" :max="limits.max_pr_monitoring_iterations" />
        </div>
      </div>

      <!-- PR Section -->
      <div v-if="detail.pr_number">
        <SectionLabel>Pull Request</SectionLabel>
        <div
          class="rounded-lg border p-3 space-y-2"
          :style="{ borderColor: 'var(--theme-border-secondary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
        >
          <div class="flex items-center gap-2">
            <a
              :href="detail.pr_url || `${GITHUB_REPO_URL}/pull/${detail.pr_number}`"
              target="_blank"
              rel="noopener"
              class="font-mono font-bold underline decoration-dotted hover:decoration-solid"
              :style="{ color: 'var(--theme-primary)' }"
            >PR #{{ detail.pr_number }}</a>
            <span
              v-if="detail.pr_state"
              class="px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ color: getPrStateColor(detail.pr_state), backgroundColor: getPrStateColor(detail.pr_state) + '22' }"
            >
              {{ detail.pr_state }}
            </span>
          </div>
          <div v-if="detail.branch_name" class="text-xs font-mono" :style="{ color: 'var(--theme-text-tertiary)' }">
            {{ detail.branch_name }}
          </div>
        </div>
      </div>

      <!-- Screenshots -->
      <div v-if="detail.local_screenshots && detail.local_screenshots.length > 0">
        <SectionLabel>Screenshots ({{ detail.local_screenshots.length }})</SectionLabel>
        <div class="grid gap-3" :class="detail.local_screenshots.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'">
          <div v-for="(ss, i) in detail.local_screenshots" :key="ss.path">
            <div class="text-xs font-medium mb-1" :style="{ color: 'var(--theme-text-tertiary)' }">
              {{ ss.label }}
            </div>
            <img
              :src="screenshotUrl(ss.path)"
              :alt="ss.label"
              class="w-full rounded border cursor-pointer hover:opacity-80 transition-opacity"
              :style="{ borderColor: 'var(--theme-border-secondary)' }"
              loading="lazy"
              @click="openLightbox(i)"
            />
          </div>
        </div>
      </div>

      <!-- Lightbox -->
      <AdwImageLightbox
        :is-open="lightboxOpen"
        :images="lightboxImages"
        :start-index="lightboxStartIndex"
        @close="lightboxOpen = false"
      />

      <!-- PR Review Feedback -->
      <div v-if="detail.pr_review_feedback.length > 0">
        <SectionLabel>Review Feedback ({{ detail.pr_review_feedback.length }})</SectionLabel>
        <div class="space-y-2">
          <AdwReviewFeedback
            v-for="(fb, i) in detail.pr_review_feedback"
            :key="i"
            :feedback="fb"
            @expand="openFeedbackModal(i)"
          />
        </div>
      </div>

      <!-- Feedback modal -->
      <AdwFeedbackModal
        :is-open="feedbackModalOpen"
        :feedbacks="detail.pr_review_feedback"
        :start-index="feedbackModalIndex"
        @close="feedbackModalOpen = false"
      />

      <!-- CI Failures -->
      <div v-if="detail.pr_ci_failures.length > 0">
        <SectionLabel>CI Failures ({{ detail.pr_ci_failures.length }})</SectionLabel>
        <div class="space-y-1">
          <div
            v-for="(ci, i) in detail.pr_ci_failures"
            :key="i"
            class="flex items-start gap-2 p-2 rounded border text-xs"
            :style="{
              borderColor: ci.addressed ? 'var(--theme-accent-success)' : 'var(--theme-border-secondary)',
              backgroundColor: 'var(--theme-bg-tertiary)',
            }"
          >
            <span :style="{ color: ci.status === 'FAIL' ? '#ef4444' : '#f59e0b' }">
              {{ ci.status === 'FAIL' ? 'x' : '!' }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium" :style="{ color: 'var(--theme-text-primary)' }">{{ ci.check_name }}</div>
              <div
                v-if="ci.details"
                class="mt-0.5 truncate"
                :style="{ color: 'var(--theme-text-tertiary)' }"
                :title="ci.details"
              >
                {{ ci.details }}
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span
                  v-if="ci.is_adw_caused"
                  class="text-[10px] px-1 rounded"
                  :style="{ color: '#ef4444', backgroundColor: '#ef444422' }"
                >ADW-caused</span>
                <span
                  v-if="ci.addressed"
                  class="text-[10px] px-1 rounded"
                  :style="{ color: 'var(--theme-accent-success)', backgroundColor: 'var(--theme-accent-success)' + '22' }"
                >Addressed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Artifacts -->
      <div v-if="detail.agents.length > 0">
        <SectionLabel>Agent Execution Timeline ({{ detail.agents.length }})</SectionLabel>
        <div class="space-y-1">
          <div
            v-for="agent in detail.agents"
            :key="agent.name"
            class="flex items-center gap-2 p-2 rounded border text-xs"
            :style="{ borderColor: 'var(--theme-border-tertiary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
          >
            <span class="font-mono font-medium min-w-0 truncate flex-1" :style="{ color: 'var(--theme-text-primary)' }">
              {{ agent.name }}
            </span>
            <span
              v-if="agent.outputSizeBytes > 0"
              class="whitespace-nowrap"
              :style="{ color: 'var(--theme-text-tertiary)' }"
            >
              {{ formatBytes(agent.outputSizeBytes) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Blockers -->
      <div v-if="detail.blockers.length > 0">
        <SectionLabel>Blockers ({{ detail.blockers.length }})</SectionLabel>
        <ul class="space-y-1">
          <li
            v-for="(blocker, i) in detail.blockers"
            :key="i"
            class="text-sm pl-3 border-l-2"
            :style="{ color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-accent-error)' }"
          >
            {{ blocker }}
          </li>
        </ul>
      </div>

      <!-- Issue Body -->
      <div v-if="detail.issue_body">
        <SectionLabel>Original Issue</SectionLabel>
        <div
          class="p-3 rounded border text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto"
          :style="{
            borderColor: 'var(--theme-border-secondary)',
            backgroundColor: 'var(--theme-bg-tertiary)',
            color: 'var(--theme-text-secondary)',
          }"
        >
          {{ detail.issue_body }}
        </div>
      </div>

      <!-- Labels -->
      <div v-if="detail.issue_labels.length > 0">
        <SectionLabel>Labels</SectionLabel>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="label in detail.issue_labels"
            :key="label"
            class="px-2 py-0.5 rounded-full text-xs border"
            :style="{ borderColor: 'var(--theme-border-secondary)', color: 'var(--theme-text-secondary)' }"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <!-- Meta -->
      <div class="text-xs space-y-1" :style="{ color: 'var(--theme-text-tertiary)' }">
        <div>ADW ID: <span class="font-mono">{{ detail.adw_id }}</span></div>
        <div v-if="detail.last_pr_check_at">Last check: {{ detail.last_pr_check_at }}</div>
        <div v-if="detail.spec_path">Spec: <span class="font-mono">{{ detail.spec_path }}</span></div>
        <div v-if="detail.e2e_test_path">E2E: <span class="font-mono">{{ detail.e2e_test_path }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, computed } from 'vue';
import type { AdwRunDetail } from '../types/adw';
import { DEFAULT_CIRCUIT_BREAKER_LIMITS } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';
import { GITHUB_REPO_URL, API_BASE_URL } from '../config';
import AdwPhaseStepper from './AdwPhaseStepper.vue';
import AdwStatusBadge from './AdwStatusBadge.vue';
import AdwReviewFeedback from './AdwReviewFeedback.vue';
import AdwFeedbackModal from './AdwFeedbackModal.vue';
import AdwImageLightbox from './AdwImageLightbox.vue';

const props = defineProps<{
  detail: AdwRunDetail;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const { getPrStateColor } = useAdwPhaseColors();
const limits = DEFAULT_CIRCUIT_BREAKER_LIMITS;

const screenshotUrl = (path: string): string => {
  return `${API_BASE_URL}/api/adw/screenshots?path=${encodeURIComponent(path)}`;
};

// Lightbox state
const lightboxOpen = ref(false);
const lightboxStartIndex = ref(0);

const lightboxImages = computed(() =>
  (props.detail.local_screenshots ?? []).map((ss) => ({
    label: ss.label,
    url: screenshotUrl(ss.path),
  }))
);

const openLightbox = (index: number) => {
  lightboxStartIndex.value = index;
  lightboxOpen.value = true;
};

// Feedback modal state
const feedbackModalOpen = ref(false);
const feedbackModalIndex = ref(0);

const openFeedbackModal = (index: number) => {
  feedbackModalIndex.value = index;
  feedbackModalOpen.value = true;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Functional sub-components
const SectionLabel = (_: any, { slots }: any) =>
  h('div', {
    class: 'text-xs font-semibold uppercase tracking-wider mb-2',
    style: { color: 'var(--theme-text-tertiary)' },
  }, slots.default?.());

const ProgressRow = (props: { label: string; value: number; max: number }) => {
  const pct = Math.min((props.value / props.max) * 100, 100);
  const isAtLimit = props.value >= props.max;
  const barColor = isAtLimit ? '#ef4444' : props.value > 0 ? '#3b82f6' : 'var(--theme-border-secondary)';

  return h('div', { class: 'flex items-center gap-2' }, [
    h('span', {
      class: 'text-xs w-28 text-right',
      style: { color: 'var(--theme-text-secondary)' },
    }, props.label),
    h('div', {
      class: 'flex-1 h-2 rounded-full overflow-hidden',
      style: { backgroundColor: 'var(--theme-bg-quaternary)' },
    }, [
      h('div', {
        class: 'h-full rounded-full transition-all duration-300',
        style: { width: `${pct}%`, backgroundColor: barColor },
      }),
    ]),
    h('span', {
      class: 'text-xs font-mono w-10',
      style: { color: isAtLimit ? '#ef4444' : 'var(--theme-text-tertiary)' },
    }, `${props.value}/${props.max}`),
  ]);
};
</script>
