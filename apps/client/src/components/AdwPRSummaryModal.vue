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
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-mono px-2 py-0.5 rounded" :style="{ backgroundColor: 'var(--theme-bg-quaternary)', color: 'var(--theme-text-secondary)' }">
              PR
            </span>
            <a
              v-if="prNumber"
              :href="`${GITHUB_REPO_URL}/pull/${prNumber}`"
              target="_blank"
              rel="noopener"
              class="font-medium text-sm truncate underline decoration-dotted hover:decoration-solid"
              :style="{ color: 'var(--theme-primary)' }"
            >
              #{{ prNumber }} {{ title }}
            </a>
            <span v-else class="font-medium text-sm truncate" :style="{ color: 'var(--theme-text-primary)' }">
              {{ title }}
            </span>
          </div>
          <button
            class="px-2 py-0.5 rounded text-sm hover:bg-[var(--theme-bg-quaternary)] transition-colors"
            :style="{ color: 'var(--theme-text-secondary)' }"
            @click="$emit('close')"
            title="Close (Esc)"
          >x</button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div
            class="adw-markdown"
            :style="{ color: 'var(--theme-text-secondary)' }"
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
