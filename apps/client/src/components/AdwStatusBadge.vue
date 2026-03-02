<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
    :style="{ backgroundColor: bgColor, color: textColor }"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BugStatus } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';

const props = defineProps<{
  status: BugStatus;
}>();

const { getStatusColor } = useAdwPhaseColors();

const bgColor = computed(() => {
  const hex = getStatusColor(props.status);
  // Use 20% opacity background
  return hex + '33';
});

const textColor = computed(() => getStatusColor(props.status));

const label = computed(() => {
  return props.status.replace(/_/g, ' ');
});
</script>
