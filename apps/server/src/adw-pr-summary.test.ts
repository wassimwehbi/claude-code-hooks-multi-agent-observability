import { test, expect, beforeAll, afterAll, mock } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Set up temp dirs before importing the server
const TEMP_BASE = join(import.meta.dir, '..', '.test-fixtures-pr');
const WORKTREES = join(TEMP_BASE, 'worktrees');
const AGENTS = join(TEMP_BASE, 'agents');

process.env.ADW_WORKTREES_PATH = WORKTREES;
process.env.ADW_AGENTS_PATH = AGENTS;
process.env.SERVER_PORT = '4112'; // Avoid conflict with running server and other tests

// Mock fetchPRSummary before importing the server
const mockFetchPRSummary = mock(async (prNumber: number) => ({
  pr_number: prNumber,
  title: `Test PR #${prNumber}`,
  body: '## Summary\n\nTest PR body',
  state: 'OPEN',
  author: 'testuser',
}));

mock.module('./adw-github.ts', () => ({
  fetchPRSummary: mockFetchPRSummary,
}));

beforeAll(async () => {
  mkdirSync(AGENTS, { recursive: true });
  mkdirSync(WORKTREES, { recursive: true });

  // Dynamically import index after env vars and mocks are set
  await import('./index.ts');
  await new Promise((r) => setTimeout(r, 200));
});

afterAll(() => {
  rmSync(TEMP_BASE, { recursive: true, force: true });
});

const BASE = 'http://localhost:4112';

test('GET /api/adw/pr-summary — missing pr param returns 400', async () => {
  const res = await fetch(`${BASE}/api/adw/pr-summary`);
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toContain('pr');
});

test('GET /api/adw/pr-summary — non-numeric pr param returns 400', async () => {
  const res = await fetch(`${BASE}/api/adw/pr-summary?pr=abc`);
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toContain('numeric');
});

test('GET /api/adw/pr-summary — has CORS headers', async () => {
  const res = await fetch(`${BASE}/api/adw/pr-summary?pr=935`);
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
});

test('GET /api/adw/pr-summary — has Cache-Control header', async () => {
  const res = await fetch(`${BASE}/api/adw/pr-summary?pr=935`);
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toContain('max-age=120');
});

test('GET /api/adw/pr-summary — success returns PR data', async () => {
  const res = await fetch(`${BASE}/api/adw/pr-summary?pr=935`);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.pr_number).toBe(935);
  expect(data.title).toBe('Test PR #935');
  expect(data.body).toContain('Test PR body');
  expect(data.state).toBe('OPEN');
  expect(data.author).toBe('testuser');
});

test('GET /api/adw/pr-summary — error returns 502', async () => {
  mockFetchPRSummary.mockImplementationOnce(async () => {
    throw new Error('gh command failed');
  });

  const res = await fetch(`${BASE}/api/adw/pr-summary?pr=999`);
  expect(res.status).toBe(502);
  const data = await res.json();
  expect(data.error).toBeTruthy();
});
