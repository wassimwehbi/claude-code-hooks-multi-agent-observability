// ADW Pipeline types — client-side copies of server types

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
  state: string;
  body: string;
  blocking_issues: string[];
  non_blocking: string[];
  addressed: boolean;
}

export interface PRCIFailure {
  check_name: string;
  status: string;
  details: string;
  is_adw_caused: boolean | null;
  addressed: boolean;
}

export interface TestResolutionAttempt {
  iteration: number;
  test_name: string;
  resolver_output: string;
  reported_status: string;
  fix_description: string;
  still_failing_after: boolean;
}

export interface AgentArtifact {
  name: string;
  prompt: string | null;
  outputSizeBytes: number;
  startedAt: number;
}

export interface AdwRunSummary {
  adw_id: string;
  bug_number: number | null;
  branch_name: string | null;
  spec_path: string | null;
  phase: BugPhase | null;
  status: BugStatus | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_monitoring_iterations: number;
  last_pr_check_at: string | null;
  issue_title: string | null;
  is_blocked: boolean;
  blockers: string[];
  implementation_attempts: number;
  review_rounds: number;
  test_retry_attempts: number;
  e2e_test_retry_attempts: number;
  feedback_iteration_count: number;
}

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
  issue_title: string | null;
  issue_body: string | null;
  issue_labels: string[];
  is_blocked: boolean;
  blockers: string[];
  is_ux_bug: boolean;
  before_screenshot_url: string | null;
  after_screenshot_url: string | null;
  e2e_test_path: string | null;
  local_screenshots: LocalScreenshot[];
  implementation_attempts: number;
  review_rounds: number;
  test_retry_attempts: number;
  e2e_test_retry_attempts: number;
  feedback_iteration_count: number;
  test_resolution_history: TestResolutionAttempt[];
  pr_review_feedback: PRReviewFeedback[];
  pr_ci_failures: PRCIFailure[];
  agents: AgentArtifact[];
}

export interface LocalScreenshot {
  label: string;
  filename: string;
  path: string;
}

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
  max_pr_monitoring_iterations: 5,
};

export interface AdwStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  blocked: number;
  activePRs: number;
  phaseDistribution: Record<string, number>;
}
