import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  '../skills/task-delegate/SKILL.md',
  '../skills/task-delegate/references/backend-selection.md',
  '../skills/task-delegate/references/permission-policy.md',
  '../skills/task-delegate/references/result-schema.md',
  '../skills/task-delegate/scripts/adapters/codex.mjs',
  '../skills/task-delegate/scripts/adapters/claude.mjs'
];

test('current security and capability docs contain no stale v0.1 target claims', async () => {
  const content = (await Promise.all(files.map(file => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n');
  assert.doesNotMatch(content, /Codex adapter is experimental|Claude adapter is experimental|interactive origin host only|six headless targets|Schema v0\.1/i);
});

test('skill documents Antigravity headless controls and result trust boundary', async () => {
  const skill = await readFile(new URL('../skills/task-delegate/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /Antigravity headless security note/);
  assert.match(skill, /workspace binding/);
  assert.match(skill, /sandbox mode/);
  assert.match(skill, /Do not trust a backend-reported success status alone/);
});

test('public legacy adapters use supported metadata', async () => {
  const content = (await Promise.all([
    'opencode.mjs', 'codex.mjs', 'claude.mjs'
  ].map(file => readFile(new URL(`../skills/task-delegate/scripts/adapters/${file}`, import.meta.url), 'utf8')))).join('\n');
  assert.doesNotMatch(content, /status:\s*'(stable|experimental)'/);
  assert.match(content, /status:\s*'supported'/);
});
