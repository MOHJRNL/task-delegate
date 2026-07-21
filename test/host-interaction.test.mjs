import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const expectedOrder = [
  'OpenCode',
  'Codex',
  'Claude',
  'Kimi',
  'z.ai',
  'Grok',
  'Antigravity'
];

test('portable skill defines one deterministic seven-target flow', async () => {
  const source = await readFile('skills/task-delegate/SKILL.md', 'utf8');
  let previous = -1;
  for (const name of expectedOrder) {
    const index = source.indexOf(name, previous + 1);
    assert.ok(index > previous, `${name} must appear in the agreed order`);
    previous = index;
  }
  assert.match(source, /task-delegate targets --json/);
  assert.match(source, /Do not silently choose a target/);
  assert.match(source, /Never commit or push automatically/);
});

test('host command starts with target discovery', async () => {
  const source = await readFile('skills/task-delegate/commands/delegate.md', 'utf8');
  assert.match(source, /task-delegate targets --json/);
  assert.match(source, /Ask the user to choose a target/);
  assert.match(source, /manual-review mode/);
});

test('Antigravity uses its dedicated global skill path', async () => {
  const source = await readFile('skills/task-delegate/scripts/core/hosts.mjs', 'utf8');
  assert.match(source, /\.gemini\/antigravity-cli\/skills/);
  assert.match(source, /id: 'antigravity'/);
});
