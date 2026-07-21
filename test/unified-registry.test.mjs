import test from 'node:test';
import assert from 'node:assert/strict';

import { TARGETS, buildInvocation, getTarget } from '../skills/task-delegate/scripts/registry.mjs';

test('registry exposes the agreed delegation targets', () => {
  assert.deepEqual(
    TARGETS.map((target) => target.id),
    [
    'opencode',
    'codex',
    'claude',
    'kimi',
    'zai',
    'grok',
    'agy',
    'auto'
  ]
  );
});

test('manual is the default and auto remains coming soon', () => {
  assert.equal(TARGETS.every((target) => target.defaultMode === 'manual'), true);
  assert.equal(getTarget('auto').status, 'coming-soon');
});

test('z.ai reuses the efficient OpenCode adapter and model', () => {
  const target = getTarget('zai');
  const invocation = buildInvocation(target, { prompt: 'test', mode: 'manual' });
  assert.equal(invocation.command, 'opencode');
  assert.equal(invocation.args.includes('zai-coding-plan/glm-4.7'), true);
});
