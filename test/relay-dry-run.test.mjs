import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const bin = path.join(repoRoot, 'bin', 'task-delegate.mjs');

function run(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

test('dry run writes compact result json', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'task-delegate-test-'));
  spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' });
  writeFileSync(path.join(dir, 'README.md'), '# test\n');
  spawnSync('git', ['add', 'README.md'], { cwd: dir, encoding: 'utf8' });
  spawnSync('git', ['-c', 'user.email=test@example.com', '-c', 'user.name=Test', 'commit', '-m', 'init'], { cwd: dir, encoding: 'utf8' });

  const brief = path.join(dir, 'brief.md');
  writeFileSync(brief, '# Brief\n\nPlan only.\n');

  const out = path.join(dir, 'out');
  const result = run(['run', '--backend', 'opencode', '--mode', 'plan', '--brief', brief, '--cd', dir, '--out', out, '--dry-run', '--allow-dirty']);

  assert.equal(result.status, 0, result.stderr);
  const resultPath = path.join(out, 'result.json');
  assert.equal(existsSync(resultPath), true);
  const json = JSON.parse(readFileSync(resultPath, 'utf8'));
  assert.equal(json.skill, 'task-delegate');
  assert.equal(json.backend, 'opencode');
  assert.equal(json.dryRun, true);
  assert.equal(json.commitAllowed, false);
});

test('doctor command reports bundled adapters', () => {
  const result = run(['doctor', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.package, 'task-delegate');
  assert.equal(json.adaptersBundled, true);
  assert.ok(Array.isArray(json.backends));
});

test('skill-path points to bundled skill folder', () => {
  const result = run(['skill-path']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.trim().endsWith('skills/task-delegate'));
});
