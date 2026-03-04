import { ref, computed } from 'vue';
import type { AdwRunSummary, AdwRunDetail, AdwStats } from '../types/adw';
import { API_BASE_URL } from '../config';

const runs = ref<AdwRunSummary[]>([]);
const selectedRunDetail = ref<AdwRunDetail | null>(null);
const loadingDetail = ref(false);

export function useAdwData() {
  const stats = computed<AdwStats>(() => {
    const phaseDistribution: Record<string, number> = {};
    let active = 0;
    let completed = 0;
    let failed = 0;
    let blocked = 0;
    let activePRs = 0;

    for (const run of runs.value) {
      if (run.phase) {
        phaseDistribution[run.phase] = (phaseDistribution[run.phase] || 0) + 1;
      }
      // The ADW pipeline uses pr_merged/pr_closed + phase=done
      // rather than a literal "completed" status
      if (run.status === 'completed' || run.status === 'pr_merged' || run.phase === 'done') {
        completed++;
      } else if (run.status === 'failed') {
        failed++;
      } else if (run.is_blocked) {
        blocked++;
      } else if (run.status) {
        active++;
      }
      if (run.pr_number != null && run.pr_state === 'OPEN') {
        activePRs++;
      }
    }

    return {
      total: runs.value.length,
      active,
      completed,
      failed,
      blocked,
      activePRs,
      phaseDistribution,
    };
  });

  function handleAdwMessage(type: string, data: any) {
    if (type === 'adw_initial' || type === 'adw_update') {
      runs.value = Array.isArray(data) ? data : [];
    }
  }

  async function fetchRunDetail(adwId: string) {
    loadingDetail.value = true;
    selectedRunDetail.value = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/adw/runs/${adwId}`);
      if (res.ok) {
        selectedRunDetail.value = await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch ADW run detail:', err);
    } finally {
      loadingDetail.value = false;
    }
  }

  function clearDetail() {
    selectedRunDetail.value = null;
  }

  return {
    runs,
    stats,
    selectedRunDetail,
    loadingDetail,
    handleAdwMessage,
    fetchRunDetail,
    clearDetail,
  };
}
