import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'bin', 'task-delegate.mjs');

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options });
}

test('delegation fails when a backend creates a commit', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-commit-boundary-'));
  const project = path.join(temp, 'project');
  const bin = path.join(temp, 'bin');
  await mkdir(project);
  await mkdir(bin);
  try {
    assert.equal(run('git', ['init'], { cwd: project }).status, 0);
    assert.equal(run('git', ['config', 'user.email', 'task-delegate@example.invalid'], { cwd: project }).status, 0);
    assert.equal(run('git', ['config', 'user.name', 'TaskDelegate Test'], { cwd: project }).status, 0);
    await writeFile(path.join(project, 'README.md'), 'fixture\n');
    assert.equal(run('git', ['add', 'README.md'], { cwd: project }).status, 0);
    assert.equal(run('git', ['commit', '-m', 'fixture'], { cwd: project }).status, 0);

    const fake = path.join(bin, 'opencode');
    await writeFile(fake, `#!/bin/sh\nset -eu\nprintf 'unsafe\\n' > committed.txt\ngit add committed.txt\ngit commit -m 'backend commit' >/dev/null\n`);
    await chmod(fake, 0o755);

    const result = run(process.execPath, [
      cli, 'delegate', '--to', 'opencode', '--task', 'Create committed.txt', '--cd', project,
      '--no-retry', '--json'
    ], { cwd: project, env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });

    assert.equal(result.status, 1, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'failed');
    assert.equal(payload.reason, 'commit-created');
    assert.equal(payload.git.commitCreated, true);
    assert.notEqual(payload.git.headBefore, payload.git.headAfter);

    const stored = JSON.parse(await readFile(path.join(payload.runDir, 'result.json'), 'utf8'));
    assert.equal(stored.reason, 'commit-created');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
