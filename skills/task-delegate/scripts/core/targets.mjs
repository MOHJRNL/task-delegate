export const TARGETS = [
  { id: 'opencode', name: 'OpenCode', binary: 'opencode', args: p => ['run', '--format', 'json', '--agent', 'build', p] },
  { id: 'codex', name: 'Codex', binary: 'codex', args: p => ['exec', p] },
  { id: 'claude', name: 'Claude Code', binary: 'claude', args: p => ['-p', p, '--permission-mode', 'default'] },
  { id: 'kimi', name: 'Kimi', binary: 'kimi', args: p => ['--prompt', p] },
  { id: 'zai', name: 'z.ai through OpenCode', binary: 'opencode', args: p => ['run', '--format', 'json', '--agent', 'build', '--model', 'zai-coding-plan/glm-4.7', p] },
  { id: 'grok', name: 'Grok', binary: 'grok', args: p => ['--single', p] },
  { id: 'agy', name: 'Antigravity', binary: 'agy', args: p => ['run', p] }
];

export function getTarget(id) { return TARGETS.find(t => t.id === id); }
