import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const cli = 'bin/task-delegate.mjs';
const names = ['OpenCode', 'Codex', 'Claude Code', 'Kimi', 'z.ai', 'Grok', 'Antigravity'];

test('human target list contains seven names without lifecycle labels', () => {
  const result = spawnSync(process.execPath, [cli, 'targets'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const [index, name] of names.entries()) {
    assert.match(result.stdout, new RegExp(`${index + 1}\\. ${name.replace('.', '\\.')}`));
  }
  assert.doesNotMatch(result.stdout, /stable|experimental|manual review|coming soon|origin host/i);
  assert.doesNotMatch(result.stdout, /Auto-select/);
});

test('JSON target list retains machine-readable details', () => {
  const result = spawnSync(process.execPath, [cli, 'targets', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.targets.map(({ id }) => id), ['opencode', 'codex', 'claude', 'kimi', 'zai', 'grok', 'agy']);
  assert.equal(payload.targets.find(({ id }) => id === 'agy').headless, true);
});
