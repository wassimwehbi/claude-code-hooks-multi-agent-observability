<template>
  <div class="h-screen flex flex-col bg-[var(--theme-bg-secondary)]">
    <!-- Header -->
    <header class="short:hidden bg-[var(--theme-primary)] border-b border-[var(--theme-primary-dark)]">
      <div class="px-3 py-2 mobile:py-1.5 mobile:px-2 flex items-center justify-between mobile:gap-2">
        <!-- Title + Tab Navigation -->
        <div class="flex items-center gap-4">
          <h1 class="text-lg mobile:hidden font-bold text-white">
            Multi-Agent Observability
          </h1>
          <!-- Tab buttons -->
          <div class="flex items-center gap-1 bg-white/10 rounded-md p-0.5">
            <button
              class="px-3 py-1 mobile:px-2 mobile:py-1 rounded text-sm font-medium transition-colors duration-150"
              :class="currentView === 'events' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'"
              @click="currentView = 'events'"
            >
              Events
            </button>
            <button
              class="px-3 py-1 mobile:px-2 mobile:py-1 rounded text-sm font-medium transition-colors duration-150"
              :class="currentView === 'adw' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'"
              @click="currentView = 'adw'"
            >
              ADW Pipeline
              <span
                v-if="adwRuns.length > 0"
                class="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/15"
              >{{ adwRuns.length }}</span>
            </button>
          </div>
        </div>

        <!-- Connection Status + Controls -->
        <div class="flex items-center gap-2">
          <!-- Connection indicator -->
          <div class="flex items-center gap-1.5">
            <span
              class="inline-flex rounded-full w-2 h-2"
              :class="isConnected ? 'bg-green-400' : 'bg-red-400'"
            ></span>
            <span class="text-xs text-white/70 font-medium mobile:hidden">
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>

          <!-- Event count -->
          <span class="text-xs text-white font-medium px-2 py-0.5 rounded bg-white/15">
            {{ events.length }}
          </span>

          <!-- Clear Button -->
          <button
            @click="handleClearClick"
            class="px-2 py-1 mobile:p-1 rounded text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
            title="Clear events"
          >
            Clear
          </button>

          <!-- Filters Toggle Button (events view only) -->
          <button
            v-if="currentView === 'events'"
            @click="showFilters = !showFilters"
            class="px-2 py-1 mobile:p-1 rounded text-xs font-medium transition-colors duration-150"
            :class="showFilters ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'"
            :title="showFilters ? 'Hide filters' : 'Show filters'"
          >
            Filters
          </button>

          <!-- Theme Manager Button -->
          <button
            @click="handleThemeManagerClick"
            class="px-2 py-1 mobile:p-1 rounded text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
            title="Open theme manager"
          >
            Theme
          </button>
        </div>
      </div>
    </header>
    
    <!-- Events View -->
    <template v-if="currentView === 'events'">
      <!-- Filters -->
      <FilterPanel
        v-if="showFilters"
        class="short:hidden"
        :filters="filters"
        @update:filters="filters = $event"
      />

      <!-- Live Pulse Chart -->
      <LivePulseChart
        :events="events"
        :filters="filters"
        @update-unique-apps="uniqueAppNames = $event"
        @update-all-apps="allAppNames = $event"
        @update-time-range="currentTimeRange = $event"
      />

      <!-- Agent Swim Lane Container (below pulse chart, full width, hidden when empty) -->
      <div v-if="selectedAgentLanes.length > 0" class="w-full bg-[var(--theme-bg-secondary)] px-3 py-4 mobile:px-2 mobile:py-2 overflow-hidden">
        <AgentSwimLaneContainer
          :selected-agents="selectedAgentLanes"
          :events="events"
          :time-range="currentTimeRange"
          @update:selected-agents="selectedAgentLanes = $event"
        />
      </div>

      <!-- Timeline -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <EventTimeline
          :events="events"
          :filters="filters"
          :unique-app-names="uniqueAppNames"
          :all-app-names="allAppNames"
          v-model:stick-to-bottom="stickToBottom"
          @select-agent="toggleAgentLane"
        />
      </div>

      <!-- Stick to bottom button -->
      <StickScrollButton
        class="short:hidden"
        :stick-to-bottom="stickToBottom"
        @toggle="stickToBottom = !stickToBottom"
      />
    </template>

    <!-- ADW Pipeline View -->
    <template v-else-if="currentView === 'adw'">
      <AdwDashboard />
    </template>
    
    <!-- Error message -->
    <div
      v-if="error"
      class="fixed bottom-4 left-4 mobile:bottom-3 mobile:left-3 mobile:right-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 mobile:px-2 mobile:py-1.5 rounded mobile:text-xs"
    >
      {{ error }}
    </div>
    
    <!-- Theme Manager -->
    <ThemeManager
      :is-open="showThemeManager"
      @close="showThemeManager = false"
    />

    <!-- Toast Notifications -->
    <ToastNotification
      v-for="(toast, index) in toasts"
      :key="toast.id"
      :index="index"
      :agent-name="toast.agentName"
      :agent-color="toast.agentColor"
      @dismiss="dismissToast(toast.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TimeRange } from './types';
import { useWebSocket } from './composables/useWebSocket';
import { useThemes } from './composables/useThemes';
import { useEventColors } from './composables/useEventColors';
import { useAdwData } from './composables/useAdwData';
import EventTimeline from './components/EventTimeline.vue';
import FilterPanel from './components/FilterPanel.vue';
import StickScrollButton from './components/StickScrollButton.vue';
import LivePulseChart from './components/LivePulseChart.vue';
import ThemeManager from './components/ThemeManager.vue';
import ToastNotification from './components/ToastNotification.vue';
import AgentSwimLaneContainer from './components/AgentSwimLaneContainer.vue';
import AdwDashboard from './components/AdwDashboard.vue';
import { WS_URL } from './config';

// WebSocket connection
const { events, adwRuns, isConnected, error, clearEvents } = useWebSocket(WS_URL);

// ADW data — feed WebSocket ADW messages into the composable
const { handleAdwMessage } = useAdwData();
watch(adwRuns, (newRuns) => {
  handleAdwMessage('adw_update', newRuns);
}, { immediate: true });

// View toggle
const currentView = ref<'events' | 'adw'>('events');

// Theme management (sets up theme system)
useThemes();

// Event colors
const { getHexColorForApp } = useEventColors();

// Filters
const filters = ref({
  sourceApp: '',
  sessionId: '',
  eventType: ''
});

// UI state
const stickToBottom = ref(true);
const showThemeManager = ref(false);
const showFilters = ref(false);
const uniqueAppNames = ref<string[]>([]); // Apps active in current time window
const allAppNames = ref<string[]>([]); // All apps ever seen in session
const selectedAgentLanes = ref<string[]>([]);
const currentTimeRange = ref<TimeRange>('1m'); // Current time range from LivePulseChart

// Toast notifications
interface Toast {
  id: number;
  agentName: string;
  agentColor: string;
}
const toasts = ref<Toast[]>([]);
let toastIdCounter = 0;
const seenAgents = new Set<string>();

// Watch for new agents and show toast
watch(uniqueAppNames, (newAppNames) => {
  // Find agents that are new (not in seenAgents set)
  newAppNames.forEach(appName => {
    if (!seenAgents.has(appName)) {
      seenAgents.add(appName);
      // Show toast for new agent
      const toast: Toast = {
        id: toastIdCounter++,
        agentName: appName,
        agentColor: getHexColorForApp(appName)
      };
      toasts.value.push(toast);
    }
  });
}, { deep: true });

const dismissToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
};

// Handle agent tag clicks for swim lanes
const toggleAgentLane = (agentName: string) => {
  const index = selectedAgentLanes.value.indexOf(agentName);
  if (index >= 0) {
    // Remove from comparison
    selectedAgentLanes.value.splice(index, 1);
  } else {
    // Add to comparison
    selectedAgentLanes.value.push(agentName);
  }
};

// Handle clear button click
const handleClearClick = () => {
  clearEvents();
  selectedAgentLanes.value = [];
};

// Debug handler for theme manager
const handleThemeManagerClick = () => {
  console.log('Theme manager button clicked!');
  showThemeManager.value = true;
};
</script>