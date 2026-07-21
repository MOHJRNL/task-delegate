import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const cli = 'bin/task-delegate.mjs';

test('Antigravity is accepted as a delegation target', () => {
  const result = spawnSync(process.execPath, [
    cli, 'delegate', '--to', 'agy', '--task', 'test', '--cd', '.',
    '--dry-run', '--allow-dirty', '--json'
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: ''
    }
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.target, 'agy');
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

test('verification summary treats all seven targets as live-capable', async () => {
  const source = await readFile(
    new URL('../skills/task-delegate/scripts/manage.mjs', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(source, /verificationMode === 'manual-host'/);
  assert.match(source, /x\.status === 'passed' && x\.live === true/);
  assert.match(source, /live passed/);
});
