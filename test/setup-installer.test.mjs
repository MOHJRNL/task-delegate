import assert from 'node:assert/strict';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

async function fakeBinary(dir, name) {
  const file = path.join(dir, name);
  await writeFile(file, '#!/bin/sh\nexit 0\n');
  await chmod(file, 0o755);
}

test('setup installs bundled 2.1.0 skill and check validates versions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-setup-test-'));
  const binDir = path.join(root, 'bin');
  await mkdir(binDir, { recursive: true });
  for (const binary of ['claude', 'codex', 'opencode', 'agy', 'kimi', 'grok', 'task-delegate']) {
    await fakeBinary(binDir, binary);
  }

  const originalHome = process.env.TASK_DELEGATE_HOME;
  const originalPath = process.env.PATH;
  process.env.TASK_DELEGATE_HOME = root;
  process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;

  try {
    const moduleUrl = new URL(`../skills/task-delegate/scripts/core/hosts.mjs?test=${Date.now()}`, import.meta.url);
    const { installHosts } = await import(moduleUrl.href);
    const installed = await installHosts();
    assert.equal(installed.filter(item => !item.builtIn && item.status === 'installed').length, 6);

    const checked = await installHosts({ check: true });
    for (const item of checked.filter(entry => !entry.builtIn)) {
      assert.equal(item.status, 'ready');
      assert.equal(item.installedVersion, '2.1.0');
      assert.equal(item.versionMatches, true);
    }

    const claudeSkill = await readFile(path.join(root, '.claude', 'skills', 'task-delegate', 'SKILL.md'), 'utf8');
    const sharedSkill = await readFile(path.join(root, '.agents', 'skills', 'task-delegate', 'SKILL.md'), 'utf8');
    const grokSkill = await readFile(path.join(root, '.grok', 'skills', 'task-delegate', 'SKILL.md'), 'utf8');
    assert.match(claudeSkill, /version: "2\.1\.0"/);
    assert.match(sharedSkill, /version: "2\.1\.0"/);
    assert.match(grokSkill, /version: "2\.1\.0"/);
  } finally {
    process.env.TASK_DELEGATE_HOME = originalHome;
    process.env.PATH = originalPath;
    await rm(root, { recursive: true, force: true });
  }
});

test('management and global help describe v2.1 commands', async () => {
  const bin = await readFile('bin/task-delegate.mjs', 'utf8');
  const manage = await readFile('skills/task-delegate/scripts/manage.mjs', 'utf8');
  assert.match(bin, /task-delegate setup \[--check\|--dry-run\]/);
  assert.match(bin, /task-delegate verify \[--live\]/);
  assert.match(manage, /Installs the bundled TaskDelegate skill/);
});
