import type { BugPhase, BugStatus } from '../types/adw';

const phaseColors: Record<BugPhase, string> = {
  preflight: '#6b7280',       // gray-500
  investigation: '#8b5cf6',   // violet-500
  e2e_test_generation: '#a78bfa', // violet-400
  design_review: '#3b82f6',   // blue-500
  implementation: '#f59e0b',  // amber-500
  testing: '#f97316',         // orange-500
  code_review: '#06b6d4',     // cyan-500
  pr_creation: '#10b981',     // emerald-500
  feedback_iteration: '#ec4899', // pink-500
  pr_monitoring: '#14b8a6',   // teal-500
  done: '#22c55e',            // green-500
};

const statusColors: Record<BugStatus, string> = {
  pending: '#6b7280',
  investigating: '#8b5cf6',
  spec_ready: '#3b82f6',
  in_review: '#3b82f6',
  implementing: '#f59e0b',
  testing: '#f97316',
  code_review: '#06b6d4',
  pr_ready: '#10b981',
  pr_created: '#10b981',
  pr_monitoring: '#14b8a6',
  pr_merged: '#22c55e',
  pr_closed: '#6b7280',
  iterating: '#ec4899',
  blocked: '#ef4444',
  completed: '#22c55e',
  failed: '#ef4444',
};

const prStateColors: Record<string, string> = {
  OPEN: '#22c55e',
  MERGED: '#8b5cf6',
  CLOSED: '#ef4444',
};

export function useAdwPhaseColors() {
  function getPhaseColor(phase: BugPhase): string {
    return phaseColors[phase] || '#6b7280';
  }

  function getStatusColor(status: BugStatus): string {
    return statusColors[status] || '#6b7280';
  }

  function getPrStateColor(prState: string): string {
    return prStateColors[prState] || '#6b7280';
  }

  return {
    getPhaseColor,
    getStatusColor,
    getPrStateColor,
    phaseColors,
    statusColors,
  };
}
