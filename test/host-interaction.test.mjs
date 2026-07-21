import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { TARGETS as REGISTRY_TARGETS, buildInvocation } from '../skills/task-delegate/scripts/registry.mjs';
import { TARGETS as CORE_TARGETS } from '../skills/task-delegate/scripts/core/targets.mjs';

const expectedNames = [
  'OpenCode',
  'Codex',
  'Claude',
  'Kimi',
  'z.ai',
  'Grok',
  'Antigravity'
];

const expectedIds = [
  'opencode',
  'codex',
  'claude',
  'kimi',
  'zai',
  'grok',
  'agy'
];

test('portable skill defines one deterministic seven-target flow', async () => {
  const source = await readFile('skills/task-delegate/SKILL.md', 'utf8');
  const canonicalSection = source.slice(source.indexOf('## Canonical targets'));
  let previous = -1;
  for (const name of expectedNames) {
    const index = canonicalSection.indexOf(name, previous + 1);
    assert.ok(index > previous, `${name} must appear in the agreed order`);
    previous = index;
  }
  assert.match(source, /task-delegate targets --json/);
  assert.match(source, /Do not silently choose a target/);
  assert.match(source, /Never commit or push automatically/);
});

test('runtime registries expose the canonical target order', () => {
  assert.deepEqual(REGISTRY_TARGETS.filter(({ id }) => id !== 'auto').map(({ id }) => id), expectedIds);
  assert.deepEqual(CORE_TARGETS.map(({ id }) => id), expectedIds);
});

test('host command starts with target discovery and safe seven-option fallback', async () => {
  const source = await readFile('skills/task-delegate/commands/delegate.md', 'utf8');
  assert.match(source, /task-delegate targets --json/);
  assert.match(source, /supports fewer than seven options/);
  assert.match(source, /Do not add an eighth/);
  assert.match(source, /manual-review mode/);
});

test('Grok activation ignores unrelated attachment context', async () => {
  const skill = await readFile('skills/task-delegate/SKILL.md', 'utf8');
  const command = await readFile('skills/task-delegate/commands/delegate.md', 'utf8');
  assert.match(skill, /Ignore unrelated attachments/);
  assert.match(skill, /Do not answer as a generic file, OCR, or attachment assistant/);
  assert.match(command, /Ignore unrelated attachments/);
});

test('Antigravity remains origin-only and is rejected as a headless invocation', () => {
  const antigravity = REGISTRY_TARGETS.find(({ id }) => id === 'agy');
  assert.equal(antigravity.headless, false);
  assert.equal(antigravity.status, 'interactive-origin-only');
  assert.throws(
    () => buildInvocation(antigravity, { prompt: 'test', mode: 'manual' }),
    /interactive origin host/
  );
});

test('Antigravity uses its dedicated global skill path', async () => {
  const source = await readFile('skills/task-delegate/scripts/core/hosts.mjs', 'utf8');
  assert.match(source, /\.gemini\/antigravity-cli\/skills/);
  assert.match(source, /id: 'antigravity'/);
});
