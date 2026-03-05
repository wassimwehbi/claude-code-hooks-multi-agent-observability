<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center"
      @keydown.escape.prevent="$emit('close')"
      tabindex="0"
      ref="backdrop"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0"
        style="background-color: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px)"
        @click="$emit('close')"
      />

      <!-- Modal -->
      <div
        class="relative z-10 flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style="width: min(90vw, 900px); height: min(85vh, 800px); background: var(--adw-bg-panel); border: 1px solid var(--adw-border); font-family: var(--adw-font-text)"
        @click.stop
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style="border-color: var(--adw-border); background: var(--adw-bg-surface)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="text-xs font-mono px-2 py-0.5 rounded"
              style="background: var(--adw-bg-card); color: var(--adw-text-secondary)"
            >PR</span>
            <a
              v-if="prNumber"
              :href="`${GITHUB_REPO_URL}/pull/${prNumber}`"
              target="_blank"
              rel="noopener"
              class="font-medium text-sm truncate hover:underline"
              style="color: var(--adw-accent-cyan)"
            >
              #{{ prNumber }} {{ title }}
            </a>
            <span v-else class="font-medium text-sm truncate" style="color: var(--adw-text-primary)">
              {{ title }}
            </span>
          </div>
          <button
            class="p-1.5 rounded-lg transition-colors hover:bg-[var(--adw-bg-card)]"
            style="color: var(--adw-text-muted)"
            @click="$emit('close')"
            title="Close (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div
            class="adw-markdown text-sm leading-relaxed"
            style="color: var(--adw-text-secondary)"
            v-html="renderedBody"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { renderMarkdown } from '../composables/useMarkdown';
import { GITHUB_REPO_URL } from '../config';

const props = defineProps<{
  isOpen: boolean;
  prNumber: number | null;
  title: string;
  body: string;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const backdrop = ref<HTMLElement | null>(null);

const renderedBody = computed(() =>
  props.body ? renderMarkdown(props.body) : ''
);

watch(() => props.isOpen, (open) => {
  if (open) {
    nextTick(() => backdrop.value?.focus());
  }
});
</script>
