<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
    :style="{ backgroundColor: bgColor, color: textColor, border: `1px solid ${textColor}33` }"
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
  return hex + '18';
});

const textColor = computed(() => getStatusColor(props.status));

const label = computed(() => {
  return props.status.replace(/_/g, ' ');
});
</script>
