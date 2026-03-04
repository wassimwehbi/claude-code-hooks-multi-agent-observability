export interface PRSummary {
  pr_number: number;
  title: string;
  body: string;
  state: string;
  author: string;
}

const GHE_HOSTNAME = process.env.GHE_HOSTNAME || 'microsoft.ghe.com';
const GHE_REPO = process.env.GHE_REPO || 'bic/workflow-designer';

// In-memory cache with 5-min TTL
const cache = new Map<number, { data: PRSummary; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchPRSummary(prNumber: number): Promise<PRSummary> {
  const cached = cache.get(prNumber);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const proc = Bun.spawn(
    ['gh', 'pr', 'view', String(prNumber), '--repo', GHE_REPO, '--json', 'number,title,body,state,author'],
    { env: { ...process.env, GH_HOST: GHE_HOSTNAME }, stdout: 'pipe', stderr: 'pipe' },
  );

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `gh pr view exited with code ${exitCode}`);
  }

  const result = JSON.parse(stdout);

  const summary: PRSummary = {
    pr_number: result.number,
    title: result.title,
    body: result.body ?? '',
    state: result.state,
    author: result.author?.login ?? String(result.author ?? ''),
  };

  cache.set(prNumber, { data: summary, fetchedAt: Date.now() });
  return summary;
}
