<template>
  <div class="h-screen flex flex-col" style="background: #0b0e17; font-family: var(--adw-font-text)">
    <!-- Header -->
    <header
      class="short:hidden border-b"
      style="background: #0b0e17; border-color: #1e2640"
    >
      <div class="px-4 py-2.5 mobile:py-1.5 mobile:px-2 flex items-center justify-between mobile:gap-2">
        <!-- Title + Tab Navigation -->
        <div class="flex items-center gap-5">
          <!-- Logo -->
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              style="background: #5b7fff22; border: 1px solid #5b7fff44"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b7fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1
              class="text-base mobile:hidden font-semibold"
              style="color: #e8eaf0"
            >Multi-Agent Observability</h1>
          </div>
          <!-- Tab buttons -->
          <div
            class="flex items-center gap-1 rounded-lg p-0.5"
            style="background: #131828; border: 1px solid #1e2640"
          >
            <button
              class="px-3 py-1.5 mobile:px-2 mobile:py-1 rounded-md text-sm font-medium transition-colors duration-150"
              :style="currentView === 'events'
                ? { background: '#1e2640', color: '#e8eaf0' }
                : { color: '#505872' }"
              @click="currentView = 'events'"
            >Events</button>
            <button
              class="px-3 py-1.5 mobile:px-2 mobile:py-1 rounded-md text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
              :style="currentView === 'adw'
                ? { background: '#1e2640', color: '#e8eaf0' }
                : { color: '#505872' }"
              @click="currentView = 'adw'"
            >
              ADW Pipeline
              <span
                v-if="adwRuns.length > 0"
                class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full"
                style="background: #5b7fff22; color: #5b7fff"
              >{{ adwRuns.length }}</span>
            </button>
          </div>
        </div>

        <!-- Connection Status + Controls -->
        <div class="flex items-center gap-3">
          <!-- Connection indicator -->
          <div
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style="background: #131828; border: 1px solid #1e2640"
          >
            <span
              class="inline-flex rounded-full w-2 h-2"
              :class="isConnected ? 'bg-green-400' : 'bg-red-400'"
            ></span>
            <span class="text-xs font-medium mobile:hidden" style="color: #8b93a8">
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </span>
            <span class="text-xs font-bold adw-font-number" style="color: #e8eaf0">
              {{ events.length }}
            </span>
          </div>

          <!-- Clear Button -->
          <button
            @click="handleClearClick"
            class="p-1.5 rounded-lg transition-colors duration-150 hover:bg-white/5"
            style="color: #505872"
            title="Clear events"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>

          <!-- Filters Toggle Button (events view only) -->
          <button
            v-if="currentView === 'events'"
            @click="showFilters = !showFilters"
            class="px-2.5 py-1 mobile:p-1 rounded-md text-xs font-medium transition-colors duration-150"
            :style="showFilters ? { background: '#1e2640', color: '#e8eaf0' } : { color: '#505872' }"
            :title="showFilters ? 'Hide filters' : 'Show filters'"
          >Filters</button>
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