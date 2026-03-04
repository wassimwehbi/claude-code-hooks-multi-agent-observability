import { ref, shallowRef, triggerRef, onMounted, onUnmounted } from 'vue';
import type { HookEvent, WebSocketMessage } from '../types';
import type { AdwRunSummary } from '../types/adw';

export function useWebSocket(url: string) {
  const events = shallowRef<HookEvent[]>([]);
  const adwRuns = ref<AdwRunSummary[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  // Get max events from environment variable or use default
  const maxEvents = parseInt(import.meta.env.VITE_MAX_EVENTS_TO_DISPLAY || '300');

  // Microtask buffer for batching incoming events
  let eventBuffer: HookEvent[] = [];
  let flushScheduled = false;

  const flushEventBuffer = () => {
    flushScheduled = false;
    if (eventBuffer.length === 0) return;

    const arr = events.value;
    arr.push(...eventBuffer);
    eventBuffer = [];

    // Trim oldest events if over limit
    if (arr.length > maxEvents) {
      events.value = arr.slice(arr.length - maxEvents + 10);
    }
    triggerRef(events);
  };

  const scheduleFlush = () => {
    if (!flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flushEventBuffer);
    }
  };

  const connect = () => {
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'initial') {
            const initialEvents = Array.isArray(message.data) ? message.data : [];
            events.value = initialEvents.slice(-maxEvents);
            triggerRef(events);
          } else if (message.type === 'event') {
            const newEvent = message.data as HookEvent;
            eventBuffer.push(newEvent);
            scheduleFlush();
          } else if (message.type === 'adw_initial' || message.type === 'adw_update') {
            adwRuns.value = Array.isArray(message.data) ? message.data as AdwRunSummary[] : [];
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        error.value = 'WebSocket connection error';
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;

        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      error.value = 'Failed to connect to server';
    }
  };

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  const clearEvents = () => {
    events.value = [];
    triggerRef(events);
  };

  return {
    events,
    adwRuns,
    isConnected,
    error,
    clearEvents
  };
}