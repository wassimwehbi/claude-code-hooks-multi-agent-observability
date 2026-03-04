<template>
  <div>
    <!-- HITL Question Section -->
    <div
      v-if="event.humanInTheLoop && (event.humanInTheLoopStatus?.status === 'pending' || hasSubmittedResponse)"
      class="mb-2 rounded border-l-4 transition-colors duration-150"
      :class="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded'
        ? 'border-l-green-500'
        : 'border-l-yellow-500 animate-pulse-slow'"
      :style="{ backgroundColor: 'var(--theme-bg-primary)', borderColor: undefined }"
      @click.stop
    >
      <div class="px-3 py-2">
        <!-- Header row -->
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
              :style="{
                color: hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? '#22c55e' : '#eab308',
                backgroundColor: (hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? '#22c55e' : '#eab308') + '22'
              }"
            >
              {{ hitlTypeLabel }}
            </span>
            <span
              v-if="permissionType"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono whitespace-nowrap"
              :style="{ color: '#3b82f6', backgroundColor: '#3b82f622' }"
            >
              {{ permissionType }}
            </span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
              :style="{ color: appHexColor, backgroundColor: appHexColor + '22' }"
            >
              {{ event.source_app }}
            </span>
            <span
              class="text-xs font-mono"
              :style="{ color: 'var(--theme-text-tertiary)' }"
            >
              {{ sessionIdShort }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span
              v-if="!hasSubmittedResponse && event.humanInTheLoopStatus?.status !== 'responded'"
              class="text-xs font-medium"
              :style="{ color: '#eab308' }"
            >
              Waiting for response...
            </span>
            <span class="text-xs" :style="{ color: 'var(--theme-text-tertiary)' }">
              {{ formatTime(event.timestamp) }}
            </span>
          </div>
        </div>

        <!-- Question Text -->
        <div
          class="mb-2 px-3 py-2 rounded border"
          :style="{
            backgroundColor: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-tertiary)'
          }"
        >
          <p class="text-sm" :style="{ color: 'var(--theme-text-primary)' }">
            {{ event.humanInTheLoop.question }}
          </p>
        </div>

        <!-- Inline Response Display (Optimistic UI) -->
        <div
          v-if="localResponse || (event.humanInTheLoopStatus?.status === 'responded' && event.humanInTheLoopStatus.response)"
          class="mb-2 px-3 py-2 rounded border border-green-400/30"
          :style="{ backgroundColor: '#22c55e' + '0a' }"
        >
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-xs font-medium" :style="{ color: '#22c55e' }">Response</span>
          </div>
          <div v-if="(localResponse?.response || event.humanInTheLoopStatus?.response?.response)" class="text-sm" :style="{ color: 'var(--theme-text-primary)' }">
            {{ localResponse?.response || event.humanInTheLoopStatus?.response?.response }}
          </div>
          <div v-if="(localResponse?.permission !== undefined || event.humanInTheLoopStatus?.response?.permission !== undefined)" class="text-sm" :style="{ color: 'var(--theme-text-primary)' }">
            {{ (localResponse?.permission ?? event.humanInTheLoopStatus?.response?.permission) ? 'Approved' : 'Denied' }}
          </div>
          <div v-if="(localResponse?.choice || event.humanInTheLoopStatus?.response?.choice)" class="text-sm" :style="{ color: 'var(--theme-text-primary)' }">
            {{ localResponse?.choice || event.humanInTheLoopStatus?.response?.choice }}
          </div>
        </div>

        <!-- Response UI -->
        <div v-if="event.humanInTheLoop.type === 'question'">
          <textarea
            v-model="responseText"
            class="w-full px-3 py-2 text-sm rounded border resize-none focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            :style="{
              backgroundColor: 'var(--theme-bg-secondary)',
              borderColor: 'var(--theme-border-secondary)',
              color: 'var(--theme-text-primary)'
            }"
            rows="2"
            placeholder="Type your response here..."
            @click.stop
          ></textarea>
          <div class="flex justify-end mt-1.5">
            <button
              @click.stop="submitResponse"
              :disabled="!responseText.trim() || isSubmitting || hasSubmittedResponse"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :style="{
                backgroundColor: '#22c55e',
                color: '#fff'
              }"
            >
              {{ isSubmitting ? 'Sending...' : 'Submit' }}
            </button>
          </div>
        </div>

        <div v-else-if="event.humanInTheLoop.type === 'permission'">
          <div class="flex justify-end items-center gap-2">
            <span
              v-if="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :style="{ color: '#22c55e', backgroundColor: '#22c55e22' }"
            >
              Responded
            </span>
            <button
              @click.stop="submitPermission(false)"
              :disabled="isSubmitting || hasSubmittedResponse"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :style="{ backgroundColor: '#ef4444', color: '#fff' }"
            >
              {{ isSubmitting ? 'Sending...' : 'Deny' }}
            </button>
            <button
              @click.stop="submitPermission(true)"
              :disabled="isSubmitting || hasSubmittedResponse"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :style="{ backgroundColor: '#22c55e', color: '#fff' }"
            >
              {{ isSubmitting ? 'Sending...' : 'Approve' }}
            </button>
          </div>
        </div>

        <div v-else-if="event.humanInTheLoop.type === 'choice'">
          <div class="flex flex-wrap gap-1.5 justify-end">
            <button
              v-for="choice in event.humanInTheLoop.choices"
              :key="choice"
              @click.stop="submitChoice(choice)"
              :disabled="isSubmitting || hasSubmittedResponse"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :style="{ backgroundColor: '#3b82f6', color: '#fff' }"
            >
              {{ isSubmitting ? 'Sending...' : choice }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Row Content (skip if HITL with humanInTheLoop) -->
    <div
      v-if="!event.humanInTheLoop"
      class="relative cursor-pointer border-b"
      :style="{
        borderColor: 'var(--theme-border-tertiary)',
        backgroundColor: isExpanded ? 'var(--theme-bg-secondary)' : 'transparent'
      }"
      @click="toggleExpanded"
      @mouseenter="handleRowHover($event, true)"
      @mouseleave="handleRowHover($event, false)"
    >
      <div class="px-3 py-1.5">
        <!-- Single monospace log line -->
        <div class="flex items-center gap-1.5 min-w-0 font-mono text-xs leading-5">
          <!-- Source app: bold colored text -->
          <span
            class="font-bold whitespace-nowrap flex-shrink-0"
            :style="{ color: appHexColor }"
          >{{ event.source_app }}</span>

          <!-- Session ID: dim -->
          <span
            class="whitespace-nowrap flex-shrink-0"
            :style="{ color: 'var(--theme-text-quaternary)' }"
          >{{ sessionIdShort }}</span>

          <!-- Event type: abbreviated, fixed-width colored text -->
          <span
            class="whitespace-nowrap flex-shrink-0 font-semibold"
            :style="{ color: eventTypeColor, width: '6ch', display: 'inline-block' }"
          >{{ eventTypeAbbrev }}</span>

          <!-- Model name: dim inline -->
          <span
            v-if="event.model_name"
            class="whitespace-nowrap flex-shrink-0"
            :style="{ color: 'var(--theme-text-quaternary)' }"
            :title="`Model: ${event.model_name}`"
          >{{ formatModelName(event.model_name) }}</span>

          <!-- Tool name: primary colored text -->
          <span
            v-if="toolName"
            class="whitespace-nowrap flex-shrink-0"
            :style="{ color: 'var(--theme-primary)' }"
          >{{ toolName }}</span>

          <!-- Tool info / detail -->
          <span
            v-if="toolInfo?.detail"
            class="truncate min-w-0"
            :style="{ color: 'var(--theme-text-tertiary)' }"
            :class="{ 'italic': event.hook_event_type === 'UserPromptSubmit' }"
          >{{ toolInfo.detail }}</span>

          <!-- Summary -->
          <span
            v-if="event.summary"
            class="truncate min-w-0 hidden md:inline"
            :style="{ color: 'var(--theme-text-secondary)' }"
          >{{ event.summary }}</span>

          <!-- Spacer -->
          <span class="flex-1"></span>

          <!-- Timestamp -->
          <span
            class="whitespace-nowrap flex-shrink-0"
            :style="{ color: 'var(--theme-text-quaternary)' }"
          >{{ formatTime(event.timestamp) }}</span>
        </div>
      </div>

      <!-- Expanded content -->
      <div
        v-if="isExpanded"
        class="border-t px-3 py-2 space-y-2"
        :style="{ borderColor: 'var(--theme-border-tertiary)', backgroundColor: 'var(--theme-bg-secondary)' }"
        @click.stop
      >
        <!-- Payload -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium" :style="{ color: 'var(--theme-text-secondary)' }">Payload</span>
            <button
              @click.stop="copyPayload"
              class="px-2 py-0.5 text-xs font-medium rounded transition-colors duration-150"
              :style="{ color: 'var(--theme-primary)', backgroundColor: 'var(--theme-primary)' + '22' }"
            >
              {{ copyButtonText }}
            </button>
          </div>
          <pre
            class="text-xs font-mono p-2 rounded border overflow-x-auto max-h-64 overflow-y-auto"
            :style="{
              color: 'var(--theme-text-primary)',
              backgroundColor: 'var(--theme-bg-tertiary)',
              borderColor: 'var(--theme-border-tertiary)'
            }"
          >{{ formattedPayload }}</pre>
        </div>

        <!-- Chat transcript button -->
        <div v-if="event.chat && event.chat.length > 0" class="flex justify-end">
          <button
            @click.stop="!isMobile && (showChatModal = true)"
            class="px-2 py-1 text-xs font-medium rounded transition-colors duration-150"
            :disabled="isMobile"
            :style="isMobile
              ? { color: 'var(--theme-text-quaternary)', backgroundColor: 'var(--theme-bg-quaternary)', cursor: 'not-allowed', opacity: '0.5' }
              : { color: 'var(--theme-primary)', backgroundColor: 'var(--theme-primary)' + '22' }
            "
          >
            {{ isMobile ? 'Chat not available on mobile' : `View Chat (${event.chat.length} messages)` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Chat Modal -->
    <ChatTranscriptModal
      v-if="event.chat && event.chat.length > 0"
      :is-open="showChatModal"
      :chat="event.chat"
      @close="showChatModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent, HumanInTheLoopResponse } from '../types';
import { useMediaQuery } from '../composables/useMediaQuery';
import ChatTranscriptModal from './ChatTranscriptModal.vue';
import { API_BASE_URL } from '../config';

const props = defineProps<{
  event: HookEvent;
  gradientClass: string;
  colorClass: string;
  appGradientClass: string;
  appColorClass: string;
  appHexColor: string;
}>();

const emit = defineEmits<{
  (e: 'response-submitted', response: HumanInTheLoopResponse): void;
}>();

// Existing refs
const isExpanded = ref(false);
const showChatModal = ref(false);
const copyButtonText = ref('Copy');

// New refs for HITL
const responseText = ref('');
const isSubmitting = ref(false);
const hasSubmittedResponse = ref(false);
const localResponse = ref<HumanInTheLoopResponse | null>(null); // Optimistic UI

// Media query for responsive design
const { isMobile } = useMediaQuery();

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// Hover handler matching AdwRunTable pattern
const handleRowHover = (event: MouseEvent, enter: boolean) => {
  if (isExpanded.value) return; // Don't change bg when expanded
  const el = event.currentTarget as HTMLElement;
  el.style.backgroundColor = enter ? 'var(--theme-bg-tertiary)' : 'transparent';
};

const sessionIdShort = computed(() => {
  return props.event.session_id.slice(0, 8);
});

// Abbreviated event type labels (fixed 6ch width)
const eventTypeAbbrev = computed(() => {
  const abbrevMap: Record<string, string> = {
    'PreToolUse': 'PRE',
    'PostToolUse': 'POST',
    'PostToolUseFailure': 'FAIL',
    'PermissionRequest': 'PERM',
    'Notification': 'NOTE',
    'Stop': 'STOP',
    'SubagentStart': 'SUB\u2191',
    'SubagentStop': 'SUB\u2193',
    'PreCompact': 'PACK',
    'UserPromptSubmit': 'PROMPT',
    'SessionStart': 'START',
    'SessionEnd': 'END'
  };
  return abbrevMap[props.event.hook_event_type] || props.event.hook_event_type.slice(0, 6).toUpperCase();
});

// Color map for event types
const eventTypeColor = computed(() => {
  const colorMap: Record<string, string> = {
    'PreToolUse': '#3b82f6',
    'PostToolUse': '#22c55e',
    'PostToolUseFailure': '#ef4444',
    'PermissionRequest': '#f59e0b',
    'Notification': '#8b5cf6',
    'Stop': '#ef4444',
    'SubagentStart': '#22c55e',
    'SubagentStop': '#6b7280',
    'PreCompact': '#6b7280',
    'UserPromptSubmit': '#3b82f6',
    'SessionStart': '#22c55e',
    'SessionEnd': '#6b7280'
  };
  return colorMap[props.event.hook_event_type] || '#6b7280';
});

// Lazy-compute formatted payload: only stringify when expanded
const formattedPayload = computed(() => {
  if (!isExpanded.value) return '';
  return JSON.stringify(props.event.payload, null, 2);
});

const toolName = computed(() => {
  const eventType = props.event.hook_event_type;
  const toolEvents = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest'];
  if (toolEvents.includes(eventType) && props.event.payload?.tool_name) {
    return props.event.payload.tool_name;
  }
  return null;
});

const toolInfo = computed(() => {
  const payload = props.event.payload;

  // Handle UserPromptSubmit events
  if (props.event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt:',
      detail: `"${payload.prompt.slice(0, 100)}${payload.prompt.length > 100 ? '...' : ''}"`
    };
  }

  // Handle PreCompact events
  if (props.event.hook_event_type === 'PreCompact') {
    const trigger = payload.trigger || 'unknown';
    return {
      tool: 'Compaction:',
      detail: trigger === 'manual' ? 'Manual compaction' : 'Auto-compaction (full context)'
    };
  }

  // Handle SessionStart events
  if (props.event.hook_event_type === 'SessionStart') {
    const source = payload.source || 'unknown';
    const sourceLabels: Record<string, string> = {
      'startup': 'New session',
      'resume': 'Resuming session',
      'clear': 'Fresh session'
    };
    return {
      tool: 'Session:',
      detail: sourceLabels[source] || source
    };
  }

  // Handle tool-based events
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };

    if (payload.tool_input) {
      const input = payload.tool_input;
      if (input.command) {
        info.detail = input.command.slice(0, 50) + (input.command.length > 50 ? '...' : '');
      } else if (input.file_path) {
        info.detail = input.file_path.split('/').pop();
      } else if (input.pattern) {
        info.detail = input.pattern;
      } else if (input.url) {
        // WebFetch
        info.detail = input.url.slice(0, 60) + (input.url.length > 60 ? '...' : '');
      } else if (input.query) {
        // WebSearch
        info.detail = `"${input.query.slice(0, 50)}${input.query.length > 50 ? '...' : ''}"`;
      } else if (input.notebook_path) {
        // NotebookEdit
        info.detail = input.notebook_path.split('/').pop();
      } else if (input.recipient) {
        // SendMessage
        info.detail = `→ ${input.recipient}${input.summary ? ': ' + input.summary : ''}`;
      } else if (input.subject) {
        // TaskCreate
        info.detail = input.subject;
      } else if (input.taskId) {
        // TaskGet, TaskUpdate
        info.detail = `#${input.taskId}${input.status ? ' → ' + input.status : ''}`;
      } else if (input.description && input.subagent_type) {
        // Task (launch agent)
        info.detail = `${input.subagent_type}: ${input.description}`;
      } else if (input.task_id) {
        // TaskOutput, TaskStop
        info.detail = `task: ${input.task_id}`;
      } else if (input.team_name) {
        // TeamCreate
        info.detail = input.team_name;
      } else if (input.skill) {
        // Skill
        info.detail = input.skill;
      }
    }

    return info;
  }

  return null;
});

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Format model name for display (e.g., "claude-haiku-4-5-20251001" -> "haiku-4-5")
const formatModelName = (name: string | null | undefined): string => {
  if (!name) return '';

  // Extract model family and version
  const parts = name.split('-');
  if (parts.length >= 4) {
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }
  return name;
};

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(formattedPayload.value);
    copyButtonText.value = 'Copied';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonText.value = 'Failed';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  }
};

// Computed properties for HITL
const hitlTypeLabel = computed(() => {
  if (!props.event.humanInTheLoop) return '';
  const labelMap = {
    question: 'Agent Question',
    permission: 'Permission Request',
    choice: 'Choice Required'
  };
  return labelMap[props.event.humanInTheLoop.type] || 'Question';
});

const permissionType = computed(() => {
  return props.event.payload?.permission_type || null;
});

// Methods for HITL responses
const submitResponse = async () => {
  if (!responseText.value.trim() || !props.event.id) return;

  const response: HumanInTheLoopResponse = {
    response: responseText.value.trim(),
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  const savedText = responseText.value;
  responseText.value = '';
  isSubmitting.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit response');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting response:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    responseText.value = savedText;
    alert('Failed to submit response. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

const submitPermission = async (approved: boolean) => {
  if (!props.event.id) return;

  const response: HumanInTheLoopResponse = {
    permission: approved,
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  isSubmitting.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit permission');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting permission:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    alert('Failed to submit permission. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

const submitChoice = async (choice: string) => {
  if (!props.event.id) return;

  const response: HumanInTheLoopResponse = {
    choice,
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  isSubmitting.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit choice');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting choice:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    alert('Failed to submit choice. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
