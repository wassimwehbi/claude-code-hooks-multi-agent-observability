import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Set up temp dirs before importing the server
const TEMP_BASE = join(import.meta.dir, '..', '.test-fixtures');
const WORKTREES = join(TEMP_BASE, 'worktrees');
const AGENTS = join(TEMP_BASE, 'agents');

process.env.ADW_WORKTREES_PATH = WORKTREES;
process.env.ADW_AGENTS_PATH = AGENTS;
process.env.SERVER_PORT = '4111'; // Avoid conflict with running server

beforeAll(() => {
  // Create fixture directories and files
  mkdirSync(join(WORKTREES, 'bug', '852', 'specs'), { recursive: true });
  mkdirSync(join(AGENTS, 'adw-test'), { recursive: true });

  writeFileSync(
    join(WORKTREES, 'bug', '852', 'specs', 'bug-852-test.md'),
    '# Bug 852\n\nThis is the spec.',
  );

  writeFileSync(
    join(AGENTS, 'adw-test', 'spec.md'),
    '# Agent Spec\n\nFallback content.',
  );
});

afterAll(() => {
  rmSync(TEMP_BASE, { recursive: true, force: true });
});

const BASE = 'http://localhost:4111';

// Helper to start server once for the test suite
let server: ReturnType<typeof Bun.serve> | null = null;

beforeAll(async () => {
  // Dynamically import index after env vars are set
  // We need to use a fresh import — the server starts on import
  const mod = await import('./index.ts');
  // Give the server a moment to bind
  await new Promise((r) => setTimeout(r, 200));
});

afterAll(() => {
  // Server cleanup isn't strictly needed for tests but good practice
});

test('GET /api/adw/specs — missing spec param returns 400', async () => {
  const res = await fetch(`${BASE}/api/adw/specs`);
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toContain('Missing spec parameter');
});

test('GET /api/adw/specs — non-.md file returns 403', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=foo.txt&bug=852`);
  expect(res.status).toBe(403);
  const data = await res.json();
  expect(data.error).toContain('.md');
});

test('GET /api/adw/specs — path traversal blocked', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=../../etc/passwd.md&bug=852`);
  // Should either 404 (not found) or 403 (path not allowed) — not serve the file
  expect([403, 404]).toContain(res.status);
});

test('GET /api/adw/specs — resolves spec via bug worktree', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=specs/bug-852-test.md&bug=852`);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.filename).toBe('bug-852-test.md');
  expect(data.content).toContain('# Bug 852');
});

test('GET /api/adw/specs — falls back to agents dir', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=adw-test/spec.md`);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.filename).toBe('spec.md');
  expect(data.content).toContain('Agent Spec');
});

test('GET /api/adw/specs — nonexistent file returns 404', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=specs/nonexistent.md&bug=999`);
  expect(res.status).toBe(404);
});

test('GET /api/adw/specs — has Cache-Control header', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=specs/bug-852-test.md&bug=852`);
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toContain('max-age=60');
});

test('GET /api/adw/specs — has CORS headers', async () => {
  const res = await fetch(`${BASE}/api/adw/specs?spec=specs/bug-852-test.md&bug=852`);
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
});
