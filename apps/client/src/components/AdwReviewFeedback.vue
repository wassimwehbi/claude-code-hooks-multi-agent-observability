<template>
  <div
    class="rounded-lg border p-3"
    :style="{
      borderColor: feedback.addressed ? 'var(--theme-accent-success)' : 'var(--theme-border-secondary)',
      backgroundColor: 'var(--theme-bg-tertiary)',
    }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm" :style="{ color: 'var(--theme-text-primary)' }">
          {{ feedback.reviewer }}
        </span>
        <span
          class="px-1.5 py-0.5 rounded text-xs font-medium"
          :style="{ color: stateColor, backgroundColor: stateColor + '22' }"
        >
          {{ feedback.state || 'COMMENT' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="feedback.addressed"
          class="text-xs px-1.5 py-0.5 rounded"
          :style="{ color: 'var(--theme-accent-success)', backgroundColor: 'var(--theme-accent-success)' + '22' }"
        >
          Addressed
        </span>
        <!-- Expand button -->
        <button
          v-if="feedback.body"
          class="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--theme-bg-quaternary)] transition-colors"
          :style="{ color: 'var(--theme-text-tertiary)' }"
          @click="$emit('expand')"
          title="View full review"
        >
          Expand
        </button>
      </div>
    </div>

    <!-- Blocking issues -->
    <div v-if="blockingIssues.length > 0" class="mb-2">
      <div class="text-xs font-medium mb-1" :style="{ color: 'var(--theme-accent-error)' }">
        Blocking ({{ blockingIssues.length }})
      </div>
      <ul class="space-y-0.5">
        <li
          v-for="(issue, i) in blockingIssues"
          :key="i"
          class="text-xs pl-3 border-l-2"
          :style="{ color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-accent-error)' }"
        >
          {{ issue }}
        </li>
      </ul>
    </div>

    <!-- Non-blocking issues -->
    <div v-if="nonBlockingIssues.length > 0" class="mb-2">
      <div class="text-xs font-medium mb-1" :style="{ color: 'var(--theme-accent-warning)' }">
        Non-blocking ({{ nonBlockingIssues.length }})
      </div>
      <ul class="space-y-0.5">
        <li
          v-for="(issue, i) in nonBlockingIssues"
          :key="i"
          class="text-xs pl-3 border-l-2"
          :style="{ color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-accent-warning)' }"
        >
          {{ issue }}
        </li>
      </ul>
    </div>

    <!-- Inline collapsible markdown body -->
    <div v-if="feedback.body">
      <button
        class="text-xs underline cursor-pointer"
        :style="{ color: 'var(--theme-text-tertiary)' }"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Hide' : 'Show' }} preview
      </button>
      <div
        v-if="expanded"
        class="mt-2 p-3 rounded text-xs overflow-x-auto max-h-[200px] overflow-y-auto adw-markdown"
        :style="{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text-secondary)' }"
        v-html="renderedBody"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PRReviewFeedback } from '../types/adw';
import { renderMarkdown } from '../composables/useMarkdown';

const props = defineProps<{
  feedback: PRReviewFeedback;
}>();

defineEmits<{
  (e: 'expand'): void;
}>();

const expanded = ref(false);

// Filter out placeholder "None" entries from issue lists
const isReal = (s: string) => s !== 'None' && s.trim() !== '';
const blockingIssues = computed(() => props.feedback.blocking_issues.filter(isReal));
const nonBlockingIssues = computed(() => props.feedback.non_blocking.filter(isReal));

const stateColor = computed(() => {
  switch (props.feedback.state) {
    case 'APPROVED': return '#22c55e';
    case 'CHANGES_REQUESTED': return '#ef4444';
    case 'COMMENTED': return '#f59e0b';
    default: return '#6b7280';
  }
});

const renderedBody = computed(() => renderMarkdown(props.feedback.body));
</script>
