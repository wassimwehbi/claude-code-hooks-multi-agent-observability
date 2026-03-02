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
        style="width: min(90vw, 900px); height: min(85vh, 800px)"
        :style="{ backgroundColor: 'var(--theme-bg-secondary)' }"
        @click.stop
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          :style="{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="font-medium text-sm" :style="{ color: 'var(--theme-text-primary)' }">
              {{ currentFeedback.reviewer }}
            </span>
            <span
              class="px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ color: stateColor, backgroundColor: stateColor + '22' }"
            >
              {{ currentFeedback.state || 'COMMENT' }}
            </span>
            <span
              v-if="currentFeedback.addressed"
              class="text-xs px-1.5 py-0.5 rounded"
              :style="{ color: 'var(--theme-accent-success)', backgroundColor: 'var(--theme-accent-success)' + '22' }"
            >
              Addressed
            </span>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <!-- Navigation -->
            <div v-if="feedbacks.length > 1" class="flex items-center gap-1">
              <button
                class="px-2 py-0.5 rounded text-xs hover:bg-[var(--theme-bg-quaternary)] transition-colors"
                :style="{ color: 'var(--theme-text-secondary)' }"
                @click="prev"
              >&lt;</button>
              <span class="text-xs" :style="{ color: 'var(--theme-text-tertiary)' }">
                {{ currentIndex + 1 }}/{{ feedbacks.length }}
              </span>
              <button
                class="px-2 py-0.5 rounded text-xs hover:bg-[var(--theme-bg-quaternary)] transition-colors"
                :style="{ color: 'var(--theme-text-secondary)' }"
                @click="next"
              >&gt;</button>
            </div>
            <!-- Close -->
            <button
              class="px-2 py-0.5 rounded text-sm hover:bg-[var(--theme-bg-quaternary)] transition-colors"
              :style="{ color: 'var(--theme-text-secondary)' }"
              @click="$emit('close')"
              title="Close (Esc)"
            >x</button>
          </div>
        </div>

        <!-- Issues summary strip -->
        <div
          v-if="blockingIssues.length > 0 || nonBlockingIssues.length > 0"
          class="flex gap-4 px-5 py-2 border-b flex-shrink-0"
          :style="{ borderColor: 'var(--theme-border-tertiary)', backgroundColor: 'var(--theme-bg-tertiary)' }"
        >
          <div v-if="blockingIssues.length > 0" class="flex-1 min-w-0">
            <div class="text-xs font-medium mb-1" :style="{ color: 'var(--theme-accent-error)' }">
              Blocking ({{ blockingIssues.length }})
            </div>
            <ul class="space-y-0.5">
              <li
                v-for="(issue, i) in blockingIssues"
                :key="i"
                class="text-xs pl-3 border-l-2"
                :style="{ color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-accent-error)' }"
              >{{ issue }}</li>
            </ul>
          </div>
          <div v-if="nonBlockingIssues.length > 0" class="flex-1 min-w-0">
            <div class="text-xs font-medium mb-1" :style="{ color: 'var(--theme-accent-warning)' }">
              Non-blocking ({{ nonBlockingIssues.length }})
            </div>
            <ul class="space-y-0.5">
              <li
                v-for="(issue, i) in nonBlockingIssues"
                :key="i"
                class="text-xs pl-3 border-l-2"
                :style="{ color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-accent-warning)' }"
              >{{ issue }}</li>
            </ul>
          </div>
        </div>

        <!-- Markdown body -->
        <div
          class="flex-1 overflow-y-auto px-5 py-4 adw-markdown"
          :style="{ color: 'var(--theme-text-secondary)' }"
          v-html="renderedBody"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { PRReviewFeedback } from '../types/adw';
import { renderMarkdown } from '../composables/useMarkdown';

const props = defineProps<{
  isOpen: boolean;
  feedbacks: PRReviewFeedback[];
  startIndex?: number;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const currentIndex = ref(props.startIndex ?? 0);
const backdrop = ref<HTMLElement | null>(null);

const currentFeedback = computed(() => props.feedbacks[currentIndex.value] ?? props.feedbacks[0]);

const isReal = (s: string) => s !== 'None' && s.trim() !== '';
const blockingIssues = computed(() => currentFeedback.value.blocking_issues.filter(isReal));
const nonBlockingIssues = computed(() => currentFeedback.value.non_blocking.filter(isReal));

const stateColor = computed(() => {
  switch (currentFeedback.value.state) {
    case 'APPROVED': return '#22c55e';
    case 'CHANGES_REQUESTED': return '#ef4444';
    case 'COMMENTED': return '#f59e0b';
    default: return '#6b7280';
  }
});

const renderedBody = computed(() =>
  currentFeedback.value.body ? renderMarkdown(currentFeedback.value.body) : '<em>No review body</em>'
);

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.feedbacks.length) % props.feedbacks.length;
};

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.feedbacks.length;
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
</script>
