import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResultV2 } from '../skills/task-delegate/scripts/core/schema.mjs';
import { HOSTS } from '../skills/task-delegate/scripts/core/hosts.mjs';
import { TARGETS } from '../skills/task-delegate/scripts/core/targets.mjs';

test('seven delegation targets are registered', () => assert.equal(TARGETS.length, 7));
test('required host integrations are registered', () => {
  for (const id of ['claude-code','codex','opencode','antigravity','kimi','grok','terminal']) assert.ok(HOSTS.some(h => h.id === id));
});
test('valid result contract passes', () => {
  assert.equal(validateResultV2({ schemaVersion:'task-delegate.result.v2', status:'completed', target:'codex', mode:'manual', changedFiles:[], reviewRequired:true, commitAllowed:false }).valid, true);
});
test('unsafe result contract fails', () => {
  const r = validateResultV2({ schemaVersion:'task-delegate.result.v2', status:'completed', target:'codex', mode:'manual', reviewRequired:false, commitAllowed:true });
  assert.equal(r.valid, false);
});
