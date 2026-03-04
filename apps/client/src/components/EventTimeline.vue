<template>
  <div class="flex-1 mobile:h-[50vh] overflow-hidden flex flex-col">
    <!-- Compact Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-[var(--theme-bg-primary)] border-b relative z-10" style="border-color: var(--theme-border-secondary);">
      <!-- Agent tags -->
      <div v-if="displayedAgentIds.length > 0" class="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
        <button
          v-for="agentId in displayedAgentIds"
          :key="agentId"
          @click="emit('selectAgent', agentId)"
          class="text-xs font-medium font-mono px-2 py-0.5 rounded-full border cursor-pointer transition-all duration-150"
          :style="{
            color: getHexColorForApp(getAppNameFromAgentId(agentId)),
            backgroundColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + '22',
            borderColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + '44',
            opacity: isAgentActive(agentId) ? 1 : 0.5,
          }"
          :title="`${isAgentActive(agentId) ? 'Active' : 'Inactive'} — click to add ${agentId} to comparison lanes`"
        >
          {{ agentId }}
        </button>
      </div>

      <!-- Search input -->
      <div class="relative w-56 mobile:w-40 shrink-0">
        <input
          type="text"
          :value="searchPattern"
          @input="updateSearchPattern(($event.target as HTMLInputElement).value)"
          placeholder="Search (regex)..."
          class="w-full px-2 py-1 rounded text-xs font-mono border bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-quaternary)] focus:outline-none transition-colors duration-150"
          :style="{
            borderColor: searchError ? 'var(--theme-accent-error)' : 'var(--theme-border-secondary)',
          }"
          aria-label="Search events with regex pattern"
        />
        <button
          v-if="searchPattern"
          @click="clearSearch"
          class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] text-xs transition-colors duration-150"
          title="Clear search"
          aria-label="Clear search"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Search error (flat, no emoji) -->
    <div
      v-if="searchError"
      class="px-3 py-1 text-xs text-[var(--theme-accent-error)] bg-[var(--theme-accent-error)]/10 border-b"
      style="border-color: var(--theme-border-secondary);"
      role="alert"
    >
      Invalid pattern: {{ searchError }}
    </div>

    <!-- Scrollable Event List -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-3 py-3 mobile:px-2 mobile:py-1.5 relative"
      @scroll="handleScroll"
    >
      <div>
        <EventRow
          v-for="event in filteredEvents"
          :key="`${event.id}-${event.timestamp}`"
          :event="event"
          :gradient-class="getGradientForSession(event.session_id)"
          :color-class="getColorForSession(event.session_id)"
          :app-gradient-class="getGradientForApp(event.source_app)"
          :app-color-class="getColorForApp(event.source_app)"
          :app-hex-color="getHexColorForApp(event.source_app)"
        />
      </div>

      <div v-if="filteredEvents.length === 0" class="text-center py-8 mobile:py-6 text-[var(--theme-text-tertiary)]">
        <p class="text-sm font-medium text-[var(--theme-text-secondary)] mb-1">No events to display</p>
        <p class="text-xs text-[var(--theme-text-quaternary)]">Events will appear here as they are received</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { HookEvent } from '../types';
import EventRow from './EventRow.vue';
import { useEventColors } from '../composables/useEventColors';
import { useEventSearch } from '../composables/useEventSearch';

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
  stickToBottom: boolean;
  uniqueAppNames?: string[]; // Agent IDs (app:session) active in current time window
  allAppNames?: string[]; // All agent IDs (app:session) ever seen in session
}>();

const emit = defineEmits<{
  'update:stickToBottom': [value: boolean];
  selectAgent: [agentName: string];
}>();

const scrollContainer = ref<HTMLElement>();
const { getGradientForSession, getColorForSession, getGradientForApp, getColorForApp, getHexColorForApp } = useEventColors();
const { searchPattern, searchError, searchEvents, updateSearchPattern, clearSearch } = useEventSearch();

// Use all agent IDs, preferring allAppNames if available (all ever seen), fallback to uniqueAppNames (active in time window)
const displayedAgentIds = computed(() => {
  return props.allAppNames?.length ? props.allAppNames : (props.uniqueAppNames || []);
});

// Extract app name from agent ID (format: "app:session")
const getAppNameFromAgentId = (agentId: string): string => {
  return agentId.split(':')[0];
};

// Check if an agent is currently active (has events in the current time window)
const isAgentActive = (agentId: string): boolean => {
  return (props.uniqueAppNames || []).includes(agentId);
};

const filteredEvents = computed(() => {
  let filtered = props.events.filter(event => {
    if (props.filters.sourceApp && event.source_app !== props.filters.sourceApp) {
      return false;
    }
    if (props.filters.sessionId && event.session_id !== props.filters.sessionId) {
      return false;
    }
    if (props.filters.eventType && event.hook_event_type !== props.filters.eventType) {
      return false;
    }
    return true;
  });

  // Apply regex search filter
  if (searchPattern.value) {
    filtered = searchEvents(filtered, searchPattern.value);
  }

  return filtered;
});

const scrollToBottom = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

const handleScroll = () => {
  if (!scrollContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

  if (isAtBottom !== props.stickToBottom) {
    emit('update:stickToBottom', isAtBottom);
  }
};

watch(() => props.events.length, async () => {
  if (props.stickToBottom) {
    await nextTick();
    scrollToBottom();
  }
});

watch(() => props.stickToBottom, (shouldStick) => {
  if (shouldStick) {
    scrollToBottom();
  }
});
</script>
