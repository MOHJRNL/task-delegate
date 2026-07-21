import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const cli = 'bin/task-delegate.mjs';

test('Antigravity rejection is concise without a stack trace', () => {
  const result = spawnSync(process.execPath, [cli, 'delegate', '--to', 'agy', '--task', 'test', '--cd', '.'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TaskDelegate error: Antigravity/);
  assert.doesNotMatch(result.stderr, /at async|file:\/\//);
});

test('delegate help documents timeout retries and JSON output', () => {
  const result = spawnSync(process.execPath, [cli, 'delegate', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--timeout-ms/);
  assert.match(result.stdout, /--retries/);
  assert.match(result.stdout, /--json/);
});

test('verify help documents bounded concurrency', () => {
  const result = spawnSync(process.execPath, [cli, 'verify', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--jobs/);
  assert.match(result.stdout, /--timeout-ms/);
  assert.match(result.stdout, /--json/);
});

test('runtime contains transient-only retry and TTY-aware output', async () => {
  const unified = await readFile('skills/task-delegate/scripts/unified.mjs', 'utf8');
  assert.match(unified, /isTransientFailure/);
  assert.match(unified, /proc\.timedOut \|\| proc\.exitCode === 127/);
  assert.match(unified, /options\.json \|\| !output\.isTTY/);
});

test('verifier uses bounded worker concurrency', async () => {
  const manage = await readFile('skills/task-delegate/scripts/manage.mjs', 'utf8');
  assert.match(manage, /DEFAULT_JOBS = 2/);
  assert.match(manage, /mapWithConcurrency/);
  assert.match(manage, /timeoutMs \+ 10_000/);
});
