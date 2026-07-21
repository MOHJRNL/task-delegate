import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('Kimi uses supported prompt flag', async () => {
  const core = await readFile('skills/task-delegate/scripts/core/targets.mjs', 'utf8');
  const registry = await readFile('skills/task-delegate/scripts/registry.mjs', 'utf8');
  assert.match(core, /id: 'kimi'.*--prompt/);
  assert.match(registry, /case 'kimi'[\s\S]*--prompt/);
});

test('runtime normalizes workspace and permission flags', async () => {
  const source = await readFile('skills/task-delegate/scripts/unified.mjs', 'utf8');
  assert.match(source, /normalizeInvocation/);
  assert.match(source, /workspace-write/);
  assert.match(source, /acceptEdits/);
  assert.match(source, /--dir/);
  assert.match(source, /--directory/);
});

test('changed files include untracked and ignore internal artifacts', async () => {
  const source = await readFile('skills/task-delegate/scripts/lib/git.mjs', 'utf8');
  assert.match(source, /status.*--porcelain/s);
  assert.match(source, /\.task-delegate\//);
});

test('Antigravity follows the normal live verification path', async () => {
  const source = await readFile('skills/task-delegate/scripts/manage.mjs', 'utf8');
  assert.doesNotMatch(source, /verificationMode\s*:\s*'manual-host'/);
  assert.match(source, /localCliPath/);
});

test('live verifier invokes the local CLI', async () => {
  const source = await readFile(
    'skills/task-delegate/scripts/manage.mjs',
    'utf8'
  );

  assert.match(source, /localCliPath/);
  assert.match(source, /process\.execPath/);
  assert.doesNotMatch(
    source,
    /run\('task-delegate', \['delegate'/
  );
});
