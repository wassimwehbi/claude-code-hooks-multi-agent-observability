import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type {
  AdwRunSummary,
  AdwRunDetail,
  AdwStats,
  AgentArtifact,
  LocalScreenshot,
  BugPhase,
  BugStatus,
} from './adw-types';
import { DEFAULT_CIRCUIT_BREAKER_LIMITS } from './adw-types';

const ADW_AGENTS_PATH = process.env.ADW_AGENTS_PATH || '/Users/nitishmeena/repos/workflow-designer/agents';
const WORKTREES_BASE = process.env.ADW_WORKTREES_PATH || '/Users/nitishmeena/repos/workflow-designer/.worktrees';
const POLL_INTERVAL_MS = 5_000;

// In-memory cache of ADW run summaries
const cache = new Map<string, AdwRunSummary>();
let cacheHash = '';

/** Read and parse a JSON file, returning null on any error */
async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Check if a file exists */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Discover local screenshots for a bug number by checking known paths */
async function discoverScreenshots(bugNumber: number, adwId: string): Promise<LocalScreenshot[]> {
  const screenshots: LocalScreenshot[] = [];
  const bugDir = join(WORKTREES_BASE, 'bug', String(bugNumber));

  // Path pattern 1: docs/screenshots/bug-{N}/{before,after}.png
  const docsScreenshotsDir = join(bugDir, 'docs', 'screenshots', `bug-${bugNumber}`);
  for (const name of ['before', 'after']) {
    const p = join(docsScreenshotsDir, `${name}.png`);
    if (await fileExists(p)) {
      screenshots.push({ label: name, filename: `${name}.png`, path: p });
    }
  }

  // Path pattern 2: docs/screenshots/bug-specs/bug-{N}/before.png
  if (screenshots.length === 0) {
    const bugSpecsDir = join(bugDir, 'docs', 'screenshots', 'bug-specs', `bug-${bugNumber}`);
    const p = join(bugSpecsDir, 'before.png');
    if (await fileExists(p)) {
      screenshots.push({ label: 'before', filename: 'before.png', path: p });
    }
  }

  // Path pattern 3: agents/{adw_id}/screenshots/*.png (issue screenshots)
  const agentScreenshotsDir = join(bugDir, 'agents', adwId, 'screenshots');
  try {
    const entries = await readdir(agentScreenshotsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.png') && !entry.endsWith('.jpg')) continue;
      const p = join(agentScreenshotsDir, entry);
      // Avoid duplicating before/after if already found
      const label = entry.replace(/\.(png|jpg)$/, '');
      screenshots.push({ label, filename: entry, path: p });
    }
  } catch {
    // no agent screenshots dir
  }

  return screenshots;
}

/** Scan a single ADW run directory and return summary */
async function scanRun(adwDir: string): Promise<AdwRunSummary | null> {
  const stateFile = join(adwDir, 'adw_state.json');
  const state = await readJson<Record<string, any>>(stateFile);
  if (!state || !state.adw_id) return null;

  // Try to enrich from bugs file
  let issueTitle: string | null = null;
  let isBlocked = false;
  let isUxBug = false;
  let blockers: string[] = [];
  let prUrl: string | null = null;
  let implAttempts = 0;
  let reviewRounds = 0;
  let testRetries = 0;
  let e2eRetries = 0;
  let feedbackIterations = 0;

  const bugsFile = join(adwDir, 'adw_state_bugs.json');
  const bugs = await readJson<Record<string, any>>(bugsFile);
  if (bugs) {
    // Get the bug entry matching this run's bug_number
    const bugKey = state.bug_number != null ? String(state.bug_number) : null;
    const bug = bugKey && bugs[bugKey] ? bugs[bugKey] : Object.values(bugs)[0];
    if (bug) {
      issueTitle = bug.issue_title ?? null;
      isBlocked = bug.is_blocked ?? false;
      isUxBug = bug.is_ux_bug ?? false;
      blockers = bug.blockers ?? [];
      prUrl = bug.pr_url ?? null;
      implAttempts = bug.implementation_attempts ?? 0;
      reviewRounds = bug.review_rounds ?? 0;
      testRetries = bug.test_retry_attempts ?? 0;
      e2eRetries = bug.e2e_test_retry_attempts ?? 0;
      feedbackIterations = bug.feedback_iteration_count ?? 0;
    }
  }

  return {
    adw_id: state.adw_id,
    bug_number: state.bug_number ?? null,
    branch_name: state.branch_name ?? null,
    spec_path: state.spec_path ?? null,
    phase: (state.phase as BugPhase) ?? null,
    status: (state.status as BugStatus) ?? null,
    pr_number: state.pr_number ?? null,
    pr_state: state.pr_state ?? null,
    pr_url: prUrl,
    pr_monitoring_iterations: state.pr_monitoring_iterations ?? 0,
    last_pr_check_at: state.last_pr_check_at ?? null,
    issue_title: issueTitle,
    is_blocked: isBlocked,
    is_ux_bug: isUxBug,
    blockers,
    implementation_attempts: implAttempts,
    review_rounds: reviewRounds,
    test_retry_attempts: testRetries,
    e2e_test_retry_attempts: e2eRetries,
    feedback_iteration_count: feedbackIterations,
  };
}

/** Scan all ADW run directories and return array of summaries */
export async function scanAll(): Promise<AdwRunSummary[]> {
  try {
    const entries = await readdir(ADW_AGENTS_PATH, { withFileTypes: true });
    const adwDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('adw-'))
      .map((e) => ({ name: e.name, path: join(ADW_AGENTS_PATH, e.name) }));

    const results = await Promise.all(adwDirs.map((d) => scanRun(d.path)));
    const runs = results.filter((r): r is AdwRunSummary => r !== null);

    // Dedup: for same bug_number, prefer latest adw_id (sort descending)
    const byBug = new Map<number, AdwRunSummary>();
    const noBug: AdwRunSummary[] = [];
    for (const run of runs) {
      if (run.bug_number == null) {
        noBug.push(run);
        continue;
      }
      const existing = byBug.get(run.bug_number);
      if (!existing || run.adw_id > existing.adw_id) {
        byBug.set(run.bug_number, run);
      }
    }

    return [...byBug.values(), ...noBug].sort((a, b) => b.adw_id.localeCompare(a.adw_id));
  } catch (err) {
    console.error('[ADW] Error scanning agents directory:', err);
    return [];
  }
}

/** Get detailed info for a specific ADW run */
export async function getRunDetail(adwId: string): Promise<AdwRunDetail | null> {
  const adwDir = join(ADW_AGENTS_PATH, adwId);

  // Read state files
  const state = await readJson<Record<string, any>>(join(adwDir, 'adw_state.json'));
  if (!state) return null;

  const bugs = await readJson<Record<string, any>>(join(adwDir, 'adw_state_bugs.json'));
  const bugKey = state.bug_number != null ? String(state.bug_number) : null;
  const bug = bugs && bugKey && bugs[bugKey] ? bugs[bugKey] : bugs ? Object.values(bugs)[0] : null;

  // Enumerate agent subdirectories for artifacts
  const agents: AgentArtifact[] = [];
  try {
    const entries = await readdir(adwDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip non-agent dirs
      if (entry.name === '.git' || entry.name.startsWith('.')) continue;

      let prompt: string | null = null;
      let outputSize = 0;
      let dirMtime = 0;

      // Get directory mtime for execution-order sorting
      const dirPath = join(adwDir, entry.name);
      try {
        const s = await stat(dirPath);
        dirMtime = s.mtimeMs;
      } catch {
        // fallback to 0
      }

      // Try to read prompt
      const promptPath = join(dirPath, 'prompts', 'bug_triage.txt');
      try {
        prompt = await readFile(promptPath, 'utf-8');
      } catch {
        // no prompt file
      }

      // Read raw_output.json for size and result event
      const outputPath = join(dirPath, 'raw_output.json');
      let costUsd: number | null = null;
      let durationMs: number | null = null;
      let durationApiMs: number | null = null;
      let numTurns: number | null = null;
      let model: string | null = null;
      let outputTokens: number | null = null;
      let cacheReadTokens: number | null = null;
      let isError = false;
      let stopReason: string | null = null;

      try {
        const s = await stat(outputPath);
        outputSize = s.size;

        // Parse to extract the result event (last event with type=result)
        const rawOutput = await readJson<any[]>(outputPath);
        if (rawOutput) {
          for (let i = rawOutput.length - 1; i >= 0; i--) {
            const ev = rawOutput[i];
            if (ev?.type === 'result') {
              costUsd = ev.total_cost_usd ?? null;
              durationMs = ev.duration_ms ?? null;
              durationApiMs = ev.duration_api_ms ?? null;
              numTurns = ev.num_turns ?? null;
              isError = ev.is_error ?? false;
              stopReason = ev.stop_reason ?? null;
              // Model from modelUsage keys
              const mu = ev.modelUsage;
              if (mu && typeof mu === 'object') {
                model = Object.keys(mu)[0] ?? null;
              }
              // Token usage
              const usage = ev.usage;
              if (usage && typeof usage === 'object') {
                outputTokens = usage.output_tokens ?? null;
                cacheReadTokens = usage.cache_read_input_tokens ?? null;
              }
              break;
            }
          }
        }
      } catch {
        // no output file or parse error
      }

      agents.push({
        name: entry.name,
        prompt,
        outputSizeBytes: outputSize,
        startedAt: dirMtime,
        costUsd,
        durationMs,
        durationApiMs,
        numTurns,
        model,
        outputTokens,
        cacheReadTokens,
        isError,
        stopReason,
      });
    }
  } catch {
    // Failed to read agent dirs
  }

  // Sort agents by execution order (directory modification time)
  agents.sort((a, b) => a.startedAt - b.startedAt);

  // Use screenshots from bug state first, fall back to filesystem discovery
  let localScreenshots: LocalScreenshot[] = [];
  if (bug) {
    // Resolve before/after screenshots from bug state
    if (bug.before_screenshot && bug.worktree_path) {
      const absPath = bug.before_screenshot.startsWith('/')
        ? bug.before_screenshot
        : join(bug.worktree_path, bug.before_screenshot);
      localScreenshots.push({ label: 'before', filename: basename(absPath), path: absPath });
    }
    if (bug.after_screenshot && bug.worktree_path) {
      const absPath = bug.after_screenshot.startsWith('/')
        ? bug.after_screenshot
        : join(bug.worktree_path, bug.after_screenshot);
      localScreenshots.push({ label: 'after', filename: basename(absPath), path: absPath });
    }
    // Add any additional screenshots from the screenshots array
    if (Array.isArray(bug.screenshots) && bug.screenshots.length > 0) {
      for (const ssPath of bug.screenshots) {
        const absPath = String(ssPath);
        const fname = basename(absPath);
        // Avoid duplicating before/after
        if (!localScreenshots.some((s) => s.path === absPath)) {
          const label = fname.replace(/\.(png|jpg|jpeg)$/, '');
          localScreenshots.push({ label, filename: fname, path: absPath });
        }
      }
    }
  }
  // Fall back to filesystem discovery when state has no screenshots
  if (localScreenshots.length === 0 && state.bug_number != null) {
    localScreenshots = await discoverScreenshots(state.bug_number, adwId);
  }

  return {
    adw_id: state.adw_id,
    bug_number: state.bug_number ?? null,
    branch_name: state.branch_name ?? null,
    spec_path: state.spec_path ?? null,
    phase: (state.phase as BugPhase) ?? null,
    status: (state.status as BugStatus) ?? null,
    pr_number: state.pr_number ?? null,
    pr_state: state.pr_state ?? null,
    pr_url: bug?.pr_url ?? null,
    pr_monitoring_iterations: state.pr_monitoring_iterations ?? 0,
    last_pr_check_at: state.last_pr_check_at ?? null,
    last_unblock_check_at: state.last_unblock_check_at ?? null,
    issue_title: bug?.issue_title ?? null,
    issue_body: bug?.issue_body ?? null,
    issue_labels: bug?.issue_labels ?? [],
    is_blocked: bug?.is_blocked ?? false,
    blockers: bug?.blockers ?? [],
    is_ux_bug: bug?.is_ux_bug ?? false,
    before_screenshot_url: bug?.before_screenshot_url ?? null,
    after_screenshot_url: bug?.after_screenshot_url ?? null,
    e2e_test_path: bug?.e2e_test_path ?? null,
    implementation_attempts: bug?.implementation_attempts ?? 0,
    review_rounds: bug?.review_rounds ?? 0,
    test_retry_attempts: bug?.test_retry_attempts ?? 0,
    e2e_test_retry_attempts: bug?.e2e_test_retry_attempts ?? 0,
    feedback_iteration_count: bug?.feedback_iteration_count ?? 0,
    feedback_history: bug?.feedback_history ?? [],
    test_resolution_history: bug?.test_resolution_history ?? [],
    pr_review_feedback: bug?.pr_review_feedback ?? [],
    pr_ci_failures: bug?.pr_ci_failures ?? [],
    agents,
    local_screenshots: localScreenshots,
  };
}

/** Compute aggregate stats from current cache */
export function getStats(): AdwStats {
  const runs = [...cache.values()];
  const phaseDistribution: Record<string, number> = {};

  let active = 0;
  let completed = 0;
  let failed = 0;
  let blocked = 0;
  let activePRs = 0;

  for (const run of runs) {
    // Phase distribution
    if (run.phase) {
      phaseDistribution[run.phase] = (phaseDistribution[run.phase] || 0) + 1;
    }

    // Status counts — the ADW pipeline uses pr_merged/pr_closed + phase=done
    // rather than a literal "completed" status
    if (run.status === 'completed' || run.status === 'pr_merged' || run.status === 'pr_closed' || run.phase === 'done') {
      completed++;
    } else if (run.status === 'failed') {
      failed++;
    } else if (run.is_blocked) {
      blocked++;
    } else if (run.status) {
      active++;
    }

    // Active PRs
    if (run.pr_number != null && run.pr_state === 'OPEN') {
      activePRs++;
    }
  }

  return {
    total: runs.length,
    active,
    completed,
    failed,
    blocked,
    activePRs,
    phaseDistribution,
  };
}

/** Start the file watcher that polls for changes and broadcasts updates */
export function startWatcher(broadcastFn: (message: string) => void): NodeJS.Timer {
  const poll = async () => {
    const runs = await scanAll();

    // Build new hash from sorted JSON to detect changes
    const newHash = JSON.stringify(runs);
    if (newHash === cacheHash) return; // No changes

    // Update cache
    cache.clear();
    for (const run of runs) {
      cache.set(run.adw_id, run);
    }
    cacheHash = newHash;

    // Broadcast update
    broadcastFn(JSON.stringify({ type: 'adw_update', data: runs }));
  };

  // Initial scan
  poll();

  return setInterval(poll, POLL_INTERVAL_MS);
}

/** Get all cached runs (for initial WebSocket connection) */
export function getCachedRuns(): AdwRunSummary[] {
  return [...cache.values()].sort((a, b) => b.adw_id.localeCompare(a.adw_id));
}
