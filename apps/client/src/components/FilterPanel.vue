<template>
  <div class="flex items-center gap-2 px-3 py-2 bg-[var(--theme-bg-primary)] border-b" style="border-color: var(--theme-border-secondary);">
    <select
      v-model="localFilters.sourceApp"
      @change="updateFilters"
      class="px-2 py-1 text-xs border rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] focus:outline-none transition-colors duration-150"
      style="border-color: var(--theme-border-secondary);"
    >
      <option value="">All Sources</option>
      <option v-for="app in filterOptions.source_apps" :key="app" :value="app">
        {{ app }}
      </option>
    </select>

    <select
      v-model="localFilters.sessionId"
      @change="updateFilters"
      class="px-2 py-1 text-xs border rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] focus:outline-none transition-colors duration-150"
      style="border-color: var(--theme-border-secondary);"
    >
      <option value="">All Sessions</option>
      <option v-for="session in filterOptions.session_ids" :key="session" :value="session">
        {{ session.slice(0, 8) }}...
      </option>
    </select>

    <select
      v-model="localFilters.eventType"
      @change="updateFilters"
      class="px-2 py-1 text-xs border rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] focus:outline-none transition-colors duration-150"
      style="border-color: var(--theme-border-secondary);"
    >
      <option value="">All Types</option>
      <option v-for="type in filterOptions.hook_event_types" :key="type" :value="type">
        {{ type }}
      </option>
    </select>

    <button
      v-if="hasActiveFilters"
      @click="clearFilters"
      class="px-2 py-1 text-xs font-medium rounded border cursor-pointer transition-colors duration-150"
      style="border-color: var(--theme-border-secondary); color: var(--theme-text-secondary); background-color: var(--theme-bg-tertiary);"
    >
      Clear
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { FilterOptions } from '../types';
import { API_BASE_URL } from '../config';

const props = defineProps<{
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
}>();

const emit = defineEmits<{
  'update:filters': [filters: typeof props.filters];
}>();

const filterOptions = ref<FilterOptions>({
  source_apps: [],
  session_ids: [],
  hook_event_types: []
});

const localFilters = ref({ ...props.filters });

const hasActiveFilters = computed(() => {
  return localFilters.value.sourceApp || localFilters.value.sessionId || localFilters.value.eventType;
});

const updateFilters = () => {
  emit('update:filters', { ...localFilters.value });
};

const clearFilters = () => {
  localFilters.value = {
    sourceApp: '',
    sessionId: '',
    eventType: ''
  };
  updateFilters();
};

const fetchFilterOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/events/filter-options`);
    if (response.ok) {
      filterOptions.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch filter options:', error);
  }
};

let filterInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  fetchFilterOptions();
  // Refresh filter options periodically
  filterInterval = setInterval(fetchFilterOptions, 10000);
});

onUnmounted(() => {
  if (filterInterval) {
    clearInterval(filterInterval);
    filterInterval = null;
  }
});
</script>