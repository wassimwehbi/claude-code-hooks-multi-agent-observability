<template>
  <div
    class="fixed inset-y-0 right-0 w-[520px] max-w-full z-50 flex flex-col shadow-2xl"
    style="background: var(--adw-bg-panel); border-left: 1px solid var(--adw-border); font-family: var(--adw-font-text)"
  >
    <!-- Header -->
    <div
      class="flex items-start justify-between px-5 py-4 border-b"
      style="border-color: var(--adw-border, #1e2640)"
    >
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <a
            v-if="detail.bug_number != null"
            :href="`${GITHUB_REPO_URL}/issues/${detail.bug_number}`"
            target="_blank"
            rel="noopener"
            class="font-bold text-xl hover:underline adw-font-number"
            style="color: var(--adw-accent-cyan, #22d3ee)"
          >Bug #{{ detail.bug_number }}</a>
          <span v-else class="font-bold text-xl" style="color: var(--adw-text-primary, #e8eaf0)">
            {{ detail.adw_id }}
          </span>
          <AdwStatusBadge v-if="detail.status" :status="detail.status" />
        </div>
        <div class="text-sm" style="color: var(--adw-text-secondary, #8b93a8)">
          {{ detail.issue_title }}
        </div>
      </div>
      <button
        class="p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2"
        style="color: var(--adw-text-muted, #505872)"
        @mouseenter="($event.target as HTMLElement).style.background = 'var(--adw-bg-surface, #1a1f35)'"
        @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
        @click="$emit('close')"
        title="Close"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto p-5 space-y-6">

      <!-- Status + Phase badges -->
      <div class="flex flex-wrap items-center gap-2">
        <AdwStatusBadge v-if="detail.status" :status="detail.status" />
        <span
          v-if="detail.phase"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          style="background: var(--adw-bg-surface, #1a1f35); color: var(--adw-text-secondary, #8b93a8); border: 1px solid var(--adw-border, #1e2640)"
        >@ {{ detail.phase.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) }}</span>
        <span
          v-if="detail.is_ux_bug"
          class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
          style="color: #a78bfa; background: #a78bfa18; border: 1px solid #a78bfa33"
        >UX</span>
      </div>

      <!-- State Banner (blocked/failed) -->
      <div
        v-if="detail.is_blocked || detail.status === 'blocked' || detail.status === 'failed'"
        class="rounded-lg border-2 p-3 space-y-2"
        style="border-color: #f87171; background: #f8717110"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold" style="color: #f87171">
            {{ detail.status === 'failed' ? 'Failed' : 'Blocked' }}
          </span>
        </div>
        <ul v-if="detail.blockers.length > 0" class="space-y-1">
          <li
            v-for="(blocker, i) in detail.blockers"
            :key="i"
            class="text-xs pl-3 border-l-2"
            style="color: var(--adw-text-secondary, #8b93a8); border-color: #f87171"
          >{{ blocker }}</li>
        </ul>
      </div>

      <!-- Spec Deep Link -->
      <div v-if="detail.spec_path" class="adw-panel-section">
        <div class="adw-panel-label">Spec</div>
        <button
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono cursor-pointer transition-colors"
          style="background: var(--adw-bg-surface, #1a1f35); color: var(--adw-accent-cyan, #22d3ee); border: 1px solid var(--adw-border, #1e2640)"
          @mouseenter="($event.target as HTMLElement).style.borderColor = 'var(--adw-accent-cyan, #22d3ee)'"
          @mouseleave="($event.target as HTMLElement).style.borderColor = 'var(--adw-border, #1e2640)'"
          @click="openSpecModal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>{{ detail.spec_path.split('/').pop() }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>

      <!-- Full phase stepper -->
      <div class="adw-panel-section">
        <div class="adw-panel-label">Pipeline Progress</div>
        <AdwPhaseStepper :current-phase="detail.phase" />
      </div>

      <!-- Circuit Breaker Status -->
      <div class="adw-panel-section">
        <div class="adw-panel-label">Circuit Breaker Status</div>
        <div class="space-y-3">
          <ProgressRow label="Implementation" :value="detail.implementation_attempts" :max="limits.max_implementation_attempts" />
          <ProgressRow label="Review rounds" :value="detail.review_rounds" :max="limits.max_review_rounds" />
          <ProgressRow label="Test retries" :value="detail.test_retry_attempts" :max="limits.max_test_retry_attempts" />
          <ProgressRow label="E2E retries" :value="detail.e2e_test_retry_attempts" :max="limits.max_e2e_test_retry_attempts" />
          <ProgressRow label="PR monitoring" :value="detail.pr_monitoring_iterations" :max="limits.max_pr_monitoring_iterations" />
        </div>
      </div>

      <!-- PR Section -->
      <div v-if="detail.pr_number || expectsPR" class="adw-panel-section">
        <div class="adw-panel-label">Pull Request</div>
        <div
          class="rounded-xl p-4 space-y-3"
          style="background: var(--adw-bg-surface, #1a1f35); border: 1px solid var(--adw-border, #1e2640)"
        >
          <template v-if="detail.pr_number">
            <div class="flex items-center gap-2">
              <a
                :href="detail.pr_url || `${GITHUB_REPO_URL}/pull/${detail.pr_number}`"
                target="_blank"
                rel="noopener"
                class="font-mono font-bold text-base hover:underline adw-font-number"
                style="color: var(--adw-accent-cyan, #22d3ee)"
              >PR #{{ detail.pr_number }}</a>
              <span
                v-if="detail.pr_state"
                class="px-2 py-0.5 rounded text-[11px] font-semibold"
                :style="prStateBadgeStyle(detail.pr_state)"
              >{{ detail.pr_state }}</span>
            </div>
            <div v-if="detail.branch_name" class="flex items-center gap-1.5 text-xs font-mono" style="color: var(--adw-text-muted, #505872)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              {{ detail.branch_name }}
            </div>
            <!-- PR Description Preview -->
            <div v-if="prSummaryLoading" class="text-xs" style="color: var(--adw-text-muted, #505872)">
              Loading PR description…
            </div>
            <div v-else-if="prSummaryError" class="text-xs" style="color: #f87171">
              {{ prSummaryError }}
            </div>
            <div v-else-if="prSummary" class="mt-1">
              <div class="text-xs font-semibold mb-1" style="color: var(--adw-text-primary, #e8eaf0)">Summary</div>
              <div
                class="relative overflow-hidden text-xs adw-markdown leading-relaxed"
                style="max-height: 4.5rem; mask-image: linear-gradient(to bottom, black 60%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%); color: var(--adw-text-secondary, #8b93a8)"
                v-html="renderMarkdown(prSummary.body)"
              />
              <button
                class="text-xs mt-1.5 hover:underline cursor-pointer"
                style="color: var(--adw-accent-cyan, #22d3ee)"
                @click="prSummaryModalOpen = true"
              >View full description</button>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium" style="color: var(--adw-accent-amber, #fbbf24)">
                No PR found — phase is "{{ detail.phase }}" but no PR number was recorded
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- Screenshots -->
      <div v-if="detail.local_screenshots && detail.local_screenshots.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">Screenshots ({{ detail.local_screenshots.length }})</div>
        <div class="grid gap-3" :class="detail.local_screenshots.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'">
          <div v-for="(ss, i) in detail.local_screenshots" :key="ss.path">
            <div class="text-xs font-medium mb-1" style="color: var(--adw-text-muted, #505872)">{{ ss.label }}</div>
            <img
              :src="screenshotUrl(ss.path)"
              :alt="ss.label"
              class="w-full rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style="border-color: var(--adw-border, #1e2640)"
              loading="lazy"
              @click="openLightbox(i)"
            />
          </div>
        </div>
      </div>

      <AdwImageLightbox
        :is-open="lightboxOpen"
        :images="lightboxImages"
        :start-index="lightboxStartIndex"
        @close="lightboxOpen = false"
      />

      <!-- Feedback Iterations -->
      <div v-if="mergedIterations.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">Feedback Iterations ({{ mergedIterations.length }})</div>
        <div class="space-y-2">
          <div
            v-for="(iter, i) in mergedIterations"
            :key="i"
            class="rounded-lg overflow-hidden"
            :style="{
              border: '1px solid ' + (iter.review?.addressed ? '#34d39944' : 'var(--adw-border, #1e2640)'),
              background: 'var(--adw-bg-surface, #1a1f35)',
            }"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer transition-colors"
              @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--adw-bg-card-hover, #1a2038)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
              @click="toggleIteration(i)"
            >
              <span
                class="text-[10px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                style="color: var(--adw-accent-blue, #5b7fff); background: #5b7fff18"
              >{{ i + 1 }}</span>
              <span class="text-xs truncate flex-1 min-w-0" style="color: var(--adw-text-secondary, #8b93a8)">
                <svg v-if="iter.review" class="inline-block mr-1 -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {{ iter.summary || (iter.review ? iter.review.reviewer + ' revi...' : `Iteration ${i + 1}`) }}
              </span>
              <span
                v-if="iter.review"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                :style="{ color: getReviewStateColor(iter.review.state), background: getReviewStateColor(iter.review.state) + '18', border: '1px solid ' + getReviewStateColor(iter.review.state) + '33' }"
              >{{ iter.review.state || 'COMMENT' }}</span>
              <span
                v-if="iter.review?.addressed"
                class="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                style="color: #34d399; background: #34d39918; border: 1px solid #34d39933"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Addressed
              </span>
              <span class="text-[10px] flex-shrink-0" style="color: var(--adw-text-muted, #505872)">
                {{ expandedIterations.has(i) ? '\u25BE' : '\u25B8' }}
              </span>
            </button>

            <div
              v-if="expandedIterations.has(i)"
              class="border-t px-3 py-2.5 space-y-3"
              style="border-color: var(--adw-border, #1e2640)"
            >
              <div v-if="iter.summary" class="text-xs" style="color: var(--adw-text-secondary, #8b93a8)">
                {{ iter.summary }}
              </div>
              <template v-if="iter.review">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium" style="color: var(--adw-text-primary, #e8eaf0)">
                    {{ iter.review.reviewer }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    :style="{ color: getReviewStateColor(iter.review.state), background: getReviewStateColor(iter.review.state) + '18' }"
                  >{{ iter.review.state || 'COMMENT' }}</span>
                </div>
                <div v-if="filteredIssues(iter.review.blocking_issues).length > 0">
                  <div class="text-[10px] font-semibold uppercase mb-1" style="color: #f87171">Blocking</div>
                  <ul class="space-y-0.5">
                    <li
                      v-for="(issue, j) in filteredIssues(iter.review.blocking_issues)"
                      :key="j"
                      class="text-xs pl-2.5 border-l-2"
                      style="color: var(--adw-text-secondary, #8b93a8); border-color: #f87171"
                    >{{ issue }}</li>
                  </ul>
                </div>
                <div v-if="filteredIssues(iter.review.non_blocking).length > 0">
                  <div class="text-[10px] font-semibold uppercase mb-1" style="color: #fbbf24">Non-blocking</div>
                  <ul class="space-y-0.5">
                    <li
                      v-for="(issue, j) in filteredIssues(iter.review.non_blocking)"
                      :key="j"
                      class="text-xs pl-2.5 border-l-2"
                      style="color: var(--adw-text-secondary, #8b93a8); border-color: #fbbf24"
                    >{{ issue }}</li>
                  </ul>
                </div>
                <div v-if="iter.review.body">
                  <button
                    class="text-[10px] cursor-pointer hover:underline"
                    style="color: var(--adw-text-muted, #505872)"
                    @click.stop="toggleReviewBody(i)"
                  >{{ expandedReviewBodies.has(i) ? 'Hide' : 'Show' }} full review</button>
                  <div
                    v-if="expandedReviewBodies.has(i)"
                    class="mt-1.5 p-2.5 rounded-lg text-xs overflow-x-auto max-h-[250px] overflow-y-auto adw-markdown"
                    style="background: var(--adw-bg-panel, #111625); color: var(--adw-text-secondary, #8b93a8)"
                    v-html="renderMarkdown(iter.review.body)"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- CI Failures -->
      <div v-if="detail.pr_ci_failures.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">CI Failures ({{ detail.pr_ci_failures.length }})</div>
        <div class="space-y-1.5">
          <div
            v-for="(ci, i) in detail.pr_ci_failures"
            :key="i"
            class="flex items-start gap-2 p-2.5 rounded-lg text-xs"
            :style="{
              border: '1px solid ' + (ci.addressed ? '#34d39944' : 'var(--adw-border, #1e2640)'),
              background: 'var(--adw-bg-surface, #1a1f35)',
            }"
          >
            <span :style="{ color: ci.status === 'FAIL' ? '#f87171' : '#fbbf24' }">
              <svg v-if="ci.status === 'FAIL'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium" style="color: var(--adw-text-primary, #e8eaf0)">{{ ci.check_name }}</div>
              <div v-if="ci.details" class="mt-0.5 truncate" style="color: var(--adw-text-muted, #505872)" :title="ci.details">{{ ci.details }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="ci.is_adw_caused" class="text-[10px] px-1 rounded" style="color: #f87171; background: #f8717118">ADW-caused</span>
                <span v-if="ci.addressed" class="text-[10px] px-1 rounded" style="color: #34d399; background: #34d39918">Addressed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Artifacts -->
      <div v-if="detail.agents.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">Agent Execution Timeline ({{ detail.agents.length }})</div>
        <div class="space-y-1.5">
          <div
            v-for="(agent, i) in detail.agents"
            :key="agent.name"
            class="flex items-center gap-2 p-2.5 rounded-lg text-xs cursor-pointer transition-colors"
            style="border: 1px solid var(--adw-border, #1e2640); background: var(--adw-bg-surface, #1a1f35)"
            @mouseenter="($event.currentTarget as HTMLElement).style.borderColor = 'var(--adw-accent-blue, #5b7fff)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.borderColor = 'var(--adw-border, #1e2640)'"
            @click="openAgentModal(i)"
          >
            <span class="text-[10px] font-mono w-4 text-center" style="color: var(--adw-text-muted, #505872)">{{ i + 1 }}</span>
            <span class="font-mono font-medium min-w-0 truncate flex-1" style="color: var(--adw-text-primary, #e8eaf0)">{{ agent.name }}</span>
            <span v-if="agent.isError" class="px-1 rounded text-[10px] font-semibold" style="color: #f87171; background: #f8717118">FAIL</span>
            <span v-if="agent.model" class="text-[10px] whitespace-nowrap" style="color: var(--adw-text-muted, #505872)">{{ agent.model.replace('claude-', '').replace(/-/g, ' ') }}</span>
            <span v-if="agent.costUsd != null" class="text-[10px] font-mono whitespace-nowrap adw-font-number" style="color: var(--adw-text-muted, #505872)">${{ agent.costUsd.toFixed(2) }}</span>
            <span v-if="agent.durationMs != null" class="text-[10px] font-mono whitespace-nowrap adw-font-number" style="color: var(--adw-text-muted, #505872)">{{ Math.round(agent.durationMs / 1000) }}s</span>
          </div>
        </div>
      </div>

      <!-- Modals -->
      <AdwAgentModal :is-open="agentModalOpen" :agents="detail.agents" :start-index="agentModalIndex" @close="agentModalOpen = false" />
      <AdwSpecModal :is-open="specModalOpen" :spec-path="specModalPath" :bug-number="detail.bug_number" @close="specModalOpen = false" />
      <AdwPRSummaryModal :is-open="prSummaryModalOpen" :pr-number="prSummary?.pr_number ?? null" :title="prSummary?.title ?? ''" :body="prSummary?.body ?? ''" @close="prSummaryModalOpen = false" />

      <!-- Blockers -->
      <div v-if="detail.blockers.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">Blockers ({{ detail.blockers.length }})</div>
        <ul class="space-y-1">
          <li v-for="(blocker, i) in detail.blockers" :key="i" class="text-sm pl-3 border-l-2" style="color: var(--adw-text-secondary, #8b93a8); border-color: #f87171">{{ blocker }}</li>
        </ul>
      </div>

      <!-- Issue Body -->
      <div v-if="detail.issue_body" class="adw-panel-section">
        <div class="adw-panel-label">Original Issue</div>
        <div
          class="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto"
          style="border: 1px solid var(--adw-border, #1e2640); background: var(--adw-bg-surface, #1a1f35); color: var(--adw-text-secondary, #8b93a8)"
        >{{ detail.issue_body }}</div>
      </div>

      <!-- Labels -->
      <div v-if="detail.issue_labels.length > 0" class="adw-panel-section">
        <div class="adw-panel-label">Labels</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="label in detail.issue_labels"
            :key="label"
            class="px-2 py-0.5 rounded-full text-xs"
            style="border: 1px solid var(--adw-border, #1e2640); color: var(--adw-text-secondary, #8b93a8)"
          >{{ label }}</span>
        </div>
      </div>

      <!-- Meta -->
      <div class="text-xs space-y-1" style="color: var(--adw-text-muted, #505872)">
        <div>ADW ID: <span class="font-mono">{{ detail.adw_id }}</span></div>
        <div v-if="detail.last_pr_check_at">Last check: {{ detail.last_pr_check_at }}</div>
        <div v-if="detail.last_unblock_check_at">Last unblock check: {{ detail.last_unblock_check_at }}</div>
        <div v-if="detail.e2e_test_path">E2E: <span class="font-mono">{{ detail.e2e_test_path }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, computed, watch } from 'vue';
import type { AdwRunDetail, PRReviewFeedback } from '../types/adw';
import { DEFAULT_CIRCUIT_BREAKER_LIMITS } from '../types/adw';
import { useAdwPhaseColors } from '../composables/useAdwPhaseColors';
import { renderMarkdown } from '../composables/useMarkdown';
import { GITHUB_REPO_URL, API_BASE_URL } from '../config';
import AdwPhaseStepper from './AdwPhaseStepper.vue';
import AdwStatusBadge from './AdwStatusBadge.vue';
import AdwAgentModal from './AdwAgentModal.vue';
import AdwImageLightbox from './AdwImageLightbox.vue';
import AdwSpecModal from './AdwSpecModal.vue';
import AdwPRSummaryModal from './AdwPRSummaryModal.vue';

const props = defineProps<{
  detail: AdwRunDetail;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const { getPrStateColor } = useAdwPhaseColors();
const limits = DEFAULT_CIRCUIT_BREAKER_LIMITS;

const PR_PHASES = new Set(['pr_creation', 'feedback_iteration', 'pr_monitoring', 'done']);
const expectsPR = computed(() => props.detail.phase != null && PR_PHASES.has(props.detail.phase));

const screenshotUrl = (path: string): string => {
  return `${API_BASE_URL}/api/adw/screenshots?path=${encodeURIComponent(path)}`;
};

const lightboxOpen = ref(false);
const lightboxStartIndex = ref(0);

const lightboxImages = computed(() =>
  (props.detail.local_screenshots ?? []).map((ss) => ({
    label: ss.label,
    url: screenshotUrl(ss.path),
  }))
);

const openLightbox = (index: number) => {
  lightboxStartIndex.value = index;
  lightboxOpen.value = true;
};

const expandedIterations = reactive(new Set<number>());
const expandedReviewBodies = reactive(new Set<number>());

interface MergedIteration {
  summary: string | null;
  review: PRReviewFeedback | null;
}

const mergedIterations = computed<MergedIteration[]>(() => {
  const history = props.detail.feedback_history ?? [];
  const reviews = props.detail.pr_review_feedback ?? [];
  const len = Math.max(history.length, reviews.length);
  const result: MergedIteration[] = [];
  for (let i = 0; i < len; i++) {
    result.push({
      summary: i < history.length ? history[i] : null,
      review: i < reviews.length ? reviews[i] : null,
    });
  }
  return result;
});

const toggleIteration = (i: number) => {
  if (expandedIterations.has(i)) {
    expandedIterations.delete(i);
    expandedReviewBodies.delete(i);
  } else {
    expandedIterations.add(i);
  }
};

const toggleReviewBody = (i: number) => {
  if (expandedReviewBodies.has(i)) {
    expandedReviewBodies.delete(i);
  } else {
    expandedReviewBodies.add(i);
  }
};

const getReviewStateColor = (state: string): string => {
  switch (state) {
    case 'APPROVED': return '#34d399';
    case 'CHANGES_REQUESTED': return '#f87171';
    case 'COMMENTED': return '#fbbf24';
    default: return '#505872';
  }
};

const prStateBadgeStyle = (state: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    OPEN: { bg: '#34d39918', text: '#34d399' },
    MERGED: { bg: '#a78bfa18', text: '#a78bfa' },
    CLOSED: { bg: '#f8717118', text: '#f87171' },
  };
  const c = colors[state] || { bg: '#505872', text: '#8b93a8' };
  return { backgroundColor: c.bg, color: c.text, border: `1px solid ${c.text}33` };
};

const filteredIssues = (issues: string[] | undefined | null): string[] =>
  (issues ?? []).filter((s) => s !== 'None' && s.trim() !== '');

const agentModalOpen = ref(false);
const agentModalIndex = ref(0);

const openAgentModal = (index: number) => {
  agentModalIndex.value = index;
  agentModalOpen.value = true;
};

const specModalOpen = ref(false);
const specModalPath = ref<string | null>(null);

const openSpecModal = () => {
  specModalPath.value = props.detail.spec_path;
  specModalOpen.value = true;
};

const prSummary = ref<{ pr_number: number; title: string; body: string; state: string; author: string } | null>(null);
const prSummaryLoading = ref(false);
const prSummaryError = ref<string | null>(null);
const prSummaryModalOpen = ref(false);

async function fetchPRDescription(prNumber: number) {
  prSummaryLoading.value = true;
  prSummaryError.value = null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/adw/pr-summary?pr=${prNumber}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    prSummary.value = await res.json();
  } catch (e: any) {
    prSummaryError.value = e.message || 'Failed to load PR summary';
  } finally {
    prSummaryLoading.value = false;
  }
}

watch(() => props.detail.pr_number, (prNumber) => {
  if (prNumber != null) {
    fetchPRDescription(prNumber);
  } else {
    prSummary.value = null;
    prSummaryError.value = null;
  }
}, { immediate: true });

const ProgressRow = (props: { label: string; value: number; max: number }) => {
  const pct = Math.min((props.value / props.max) * 100, 100);
  const isAtLimit = props.value >= props.max;
  const barColor = isAtLimit ? '#f87171' : props.value > 0 ? '#5b7fff' : 'transparent';

  return h('div', { class: 'flex items-center gap-3' }, [
    h('span', {
      class: 'text-xs w-28 text-right',
      style: { color: 'var(--adw-text-secondary, #8b93a8)' },
    }, props.label),
    h('div', {
      class: 'flex-1 h-2 rounded-full overflow-hidden',
      style: { backgroundColor: 'var(--adw-bg-base, #0b0e17)' },
    }, [
      h('div', {
        class: 'h-full rounded-full transition-all duration-300',
        style: { width: `${pct}%`, backgroundColor: barColor },
      }),
    ]),
    h('span', {
      class: 'text-xs font-mono w-12 text-right adw-font-number',
      style: { color: isAtLimit ? '#f87171' : 'var(--adw-text-muted, #505872)' },
    }, `${props.value}/${props.max}`),
  ]);
};
</script>
