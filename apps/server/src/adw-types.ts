// ADW Pipeline types — mirrors the Python data model from workflow-designer

export const BUG_PHASES = [
  'preflight',
  'investigation',
  'e2e_test_generation',
  'design_review',
  'implementation',
  'testing',
  'code_review',
  'pr_creation',
  'feedback_iteration',
  'pr_monitoring',
  'done',
] as const;

export type BugPhase = (typeof BUG_PHASES)[number];

export type BugStatus =
  | 'pending'
  | 'investigating'
  | 'spec_ready'
  | 'in_review'
  | 'implementing'
  | 'testing'
  | 'code_review'
  | 'pr_ready'
  | 'pr_created'
  | 'pr_monitoring'
  | 'pr_merged'
  | 'pr_closed'
  | 'iterating'
  | 'blocked'
  | 'completed'
  | 'failed';

export interface PRReviewFeedback {
  reviewer: string;
  state: string; // "CHANGES_REQUESTED" | "COMMENTED" | "APPROVED" | ""
  body: string;
  blocking_issues: string[];
  non_blocking: string[];
  addressed: boolean;
}

export interface PRCIFailure {
  check_name: string;
  status: string; // "FAIL" | "ERROR" | "PENDING" | ""
  details: string;
  is_adw_caused: boolean | null;
  addressed: boolean;
}

export interface TestResolutionAttempt {
  iteration: number;
  test_name: string;
  resolver_output: string;
  reported_status: string; // "RESOLVED" | "UNRESOLVED" | ""
  fix_description: string;
  still_failing_after: boolean;
}

export interface AgentArtifact {
  name: string;
  prompt: string | null;
  outputSizeBytes: number;
  startedAt: number; // directory mtime in ms — used for execution-order sorting
  // Extracted from raw_output.json result event
  costUsd: number | null;
  durationMs: number | null;
  durationApiMs: number | null;
  numTurns: number | null;
  model: string | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  isError: boolean;
  stopReason: string | null;
}

/** Light summary used in the table view — read from adw_state.json */
export interface AdwRunSummary {
  adw_id: string;
  bug_number: number | null;
  branch_name: string | null;
  spec_path: string | null;
  phase: BugPhase | null;
  status: BugStatus | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_url: string | null;
  pr_monitoring_iterations: number;
  last_pr_check_at: string | null;
  // Enriched from adw_state_bugs.json (if present)
  issue_title: string | null;
  is_blocked: boolean;
  is_ux_bug: boolean;
  blockers: string[];
  implementation_attempts: number;
  review_rounds: number;
  test_retry_attempts: number;
  e2e_test_retry_attempts: number;
  feedback_iteration_count: number;
}

/** Full detail loaded on drill-down — assembled from adw_state_bugs.json + artifacts */
export interface AdwRunDetail {
  adw_id: string;
  bug_number: number | null;
  branch_name: string | null;
  spec_path: string | null;
  phase: BugPhase | null;
  status: BugStatus | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_url: string | null;
  pr_monitoring_iterations: number;
  last_pr_check_at: string | null;
  last_unblock_check_at: string | null;
  // Bug detail
  issue_title: string | null;
  issue_body: string | null;
  issue_labels: string[];
  is_blocked: boolean;
  blockers: string[];
  is_ux_bug: boolean;
  before_screenshot_url: string | null;
  after_screenshot_url: string | null;
  e2e_test_path: string | null;
  // Local screenshots discovered on disk (served via /api/adw/screenshots/:bugNumber/:filename)
  local_screenshots: LocalScreenshot[];
  // Attempt counters
  implementation_attempts: number;
  review_rounds: number;
  test_retry_attempts: number;
  e2e_test_retry_attempts: number;
  feedback_iteration_count: number;
  feedback_history: string[];
  test_resolution_history: TestResolutionAttempt[];
  // PR feedback
  pr_review_feedback: PRReviewFeedback[];
  pr_ci_failures: PRCIFailure[];
  // Agent artifacts
  agents: AgentArtifact[];
}

export interface LocalScreenshot {
  label: string;   // "before", "after", or descriptive name
  filename: string; // filename for the serve endpoint
  path: string;     // absolute path on disk (server-side only)
}

/** Circuit breaker limits — used for progress bars in detail panel */
export interface CircuitBreakerLimits {
  max_implementation_attempts: number;
  max_review_rounds: number;
  max_test_retry_attempts: number;
  max_e2e_test_retry_attempts: number;
  max_pr_monitoring_iterations: number;
}

export const DEFAULT_CIRCUIT_BREAKER_LIMITS: CircuitBreakerLimits = {
  max_implementation_attempts: 5,
  max_review_rounds: 3,
  max_test_retry_attempts: 4,
  max_e2e_test_retry_attempts: 2,
  max_pr_monitoring_iterations: 50,
};

/** Aggregate stats for the stats bar */
export interface AdwStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  blocked: number;
  activePRs: number;
  phaseDistribution: Record<string, number>;
}
