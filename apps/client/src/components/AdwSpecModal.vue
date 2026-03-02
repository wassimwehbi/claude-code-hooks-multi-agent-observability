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
              .md
            </span>
            <span class="font-medium text-sm truncate" :style="{ color: 'var(--theme-text-primary)' }">
              {{ filename }}
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
          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center h-32">
            <span class="text-sm" :style="{ color: 'var(--theme-text-tertiary)' }">Loading spec...</span>
          </div>
          <!-- Error -->
          <div v-else-if="error" class="flex items-center justify-center h-32">
            <span class="text-sm" :style="{ color: '#ef4444' }">{{ error }}</span>
          </div>
          <!-- Content -->
          <div
            v-else
            class="adw-markdown"
            :style="{ color: 'var(--theme-text-secondary)' }"
            v-html="renderedContent"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { renderMarkdown } from '../composables/useMarkdown';
import { API_BASE_URL } from '../config';

const props = defineProps<{
  isOpen: boolean;
  specPath: string | null;
  bugNumber: number | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const backdrop = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const content = ref('');
const filename = ref('');

const renderedContent = computed(() =>
  content.value ? renderMarkdown(content.value) : ''
);

async function fetchSpec(specPath: string, bugNumber: number | null) {
  loading.value = true;
  error.value = null;
  content.value = '';
  filename.value = specPath.split('/').pop() || 'spec.md';

  try {
    const params = new URLSearchParams({ spec: specPath });
    if (bugNumber != null) params.set('bug', String(bugNumber));
    const res = await fetch(`${API_BASE_URL}/api/adw/specs?${params}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    content.value = data.content;
    filename.value = data.filename;
  } catch (e: any) {
    error.value = e.message || 'Failed to load spec';
  } finally {
    loading.value = false;
  }
}

watch(() => props.isOpen, (open) => {
  if (open && props.specPath) {
    fetchSpec(props.specPath, props.bugNumber);
    nextTick(() => backdrop.value?.focus());
  }
});
</script>
