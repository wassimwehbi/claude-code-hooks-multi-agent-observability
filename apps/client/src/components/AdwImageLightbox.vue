<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center"
      @keydown.left.prevent="prev"
      @keydown.right.prevent="next"
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

      <!-- Content -->
      <div class="relative z-10 flex flex-col items-center max-w-[90vw] max-h-[90vh]">
        <!-- Top bar: label + counter + close -->
        <div class="flex items-center justify-between w-full mb-3 px-1">
          <span class="text-white text-sm font-medium truncate max-w-[60%]">
            {{ currentImage.label }}
          </span>
          <div class="flex items-center gap-3">
            <span class="text-white/60 text-xs">
              {{ currentIndex + 1 }} / {{ images.length }}
            </span>
            <button
              class="text-white/70 hover:text-white text-xl leading-none px-1 transition-colors"
              @click="$emit('close')"
              title="Close (Esc)"
            >x</button>
          </div>
        </div>

        <!-- Image area -->
        <div class="relative flex items-center">
          <!-- Prev button -->
          <button
            v-if="images.length > 1"
            class="absolute -left-12 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors text-lg"
            @click="prev"
            title="Previous (Left arrow)"
          >&lt;</button>

          <!-- Image -->
          <img
            :src="currentImage.url"
            :alt="currentImage.label"
            class="max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl object-contain"
            @click.stop
          />

          <!-- Next button -->
          <button
            v-if="images.length > 1"
            class="absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors text-lg"
            @click="next"
            title="Next (Right arrow)"
          >&gt;</button>
        </div>

        <!-- Thumbnail strip -->
        <div v-if="images.length > 1" class="flex items-center gap-2 mt-3">
          <button
            v-for="(img, i) in images"
            :key="img.url"
            class="w-12 h-12 rounded border-2 overflow-hidden transition-all duration-150 flex-shrink-0"
            :class="i === currentIndex ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-80'"
            :style="{ borderColor: i === currentIndex ? 'white' : 'transparent' }"
            @click="currentIndex = i"
          >
            <img :src="img.url" :alt="img.label" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

export interface LightboxImage {
  label: string;
  url: string;
}

const props = defineProps<{
  isOpen: boolean;
  images: LightboxImage[];
  startIndex?: number;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const currentIndex = ref(props.startIndex ?? 0);
const backdrop = ref<HTMLElement | null>(null);

const currentImage = computed(() => props.images[currentIndex.value] ?? props.images[0]);

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length;
};

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.images.length;
};

// Reset index when opened, and auto-focus for keyboard events
watch(() => props.isOpen, (open) => {
  if (open) {
    currentIndex.value = props.startIndex ?? 0;
    nextTick(() => backdrop.value?.focus());
  }
});

// Sync if startIndex prop changes while open
watch(() => props.startIndex, (v) => {
  if (v != null) currentIndex.value = v;
});
</script>
