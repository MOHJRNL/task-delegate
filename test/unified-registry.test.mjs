import test from 'node:test';
import assert from 'node:assert/strict';

import { TARGETS, buildInvocation, getTarget } from '../skills/task-delegate/scripts/registry.mjs';

const expectedIds = ['opencode', 'codex', 'claude', 'kimi', 'zai', 'grok', 'agy'];

test('registry exposes exactly seven public delegation targets', () => {
  assert.deepEqual(TARGETS.map((target) => target.id), expectedIds);
});

test('manual is the default for every public target and auto is hidden', () => {
  assert.equal(TARGETS.every((target) => target.defaultMode === 'manual'), true);
  assert.equal(getTarget('auto'), undefined);
});

test('z.ai reuses the OpenCode adapter and configured model', () => {
  const invocation = buildInvocation(getTarget('zai'), { prompt: 'test', mode: 'manual' });
  assert.equal(invocation.command, 'opencode');
  assert.equal(invocation.args.includes('zai-coding-plan/glm-4.7'), true);
});

test('Antigravity uses headless print mode with sandboxed auto-approval', () => {
  const invocation = buildInvocation(getTarget('agy'), { prompt: 'test', mode: 'manual' });
  assert.equal(invocation.command, 'agy');
  for (const flag of ['--print', '--mode', '--print-timeout', '--sandbox', '--dangerously-skip-permissions', '--output-format']) {
    assert.equal(invocation.args.includes(flag), true, `missing ${flag}`);
  }
});
