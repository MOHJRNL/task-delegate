export const TARGETS = [
  { id: 'opencode', name: 'OpenCode', binary: 'opencode', status: 'stable', defaultMode: 'manual' },
  { id: 'codex', name: 'Codex', binary: 'codex', status: 'stable', defaultMode: 'manual' },
  { id: 'claude', name: 'Claude Code', binary: 'claude', status: 'stable', defaultMode: 'manual' },
  { id: 'kimi', name: 'Kimi', binary: 'kimi', status: 'experimental', defaultMode: 'manual' },
  { id: 'zai', name: 'z.ai', binary: 'opencode', status: 'stable', defaultMode: 'manual', defaultModel: 'zai-coding-plan/glm-4.7' },
  { id: 'grok', name: 'Grok', binary: 'grok', status: 'experimental', defaultMode: 'manual' },
  {
    id: 'agy',
    name: 'Antigravity',
    binary: 'agy',
    status: 'interactive-origin-only',
    defaultMode: 'manual',
    headless: false
  },
  { id: 'auto', name: 'Auto-select', binary: null, status: 'coming-soon', defaultMode: 'manual' }
];

export function getTarget(id) {
  return TARGETS.find((target) => target.id === id);
}

export function buildInvocation(target, { prompt, mode = 'manual', model }) {
  const effectiveModel = model || target.defaultModel;
  const planPrefix = mode === 'plan'
    ? 'PLAN ONLY. Do not edit files. Return a concise implementation plan.\n\n'
    : '';
  const effectivePrompt = `${planPrefix}${prompt}`;

  switch (target.id) {
    case 'opencode':
    case 'zai': {
      const args = ['run', '--format', 'json', '--agent', mode === 'plan' ? 'plan' : 'build'];
      if (effectiveModel) args.push('--model', effectiveModel);
      args.push(effectivePrompt);
      return {
        command: 'opencode',
        args,
        env: {
          OPENCODE_DISABLE_AUTOUPDATE: 'true',
          OPENCODE_DISABLE_PRUNE: 'true'
        }
      };
    }
    case 'codex': {
      const args = ['exec'];
      if (effectiveModel) args.push('-m', effectiveModel);
      args.push(effectivePrompt);
      return { command: 'codex', args, env: {} };
    }
    case 'claude': {
      const args = ['-p', effectivePrompt, '--permission-mode', mode === 'plan' ? 'plan' : 'default'];
      if (effectiveModel) args.push('--model', effectiveModel);
      return { command: 'claude', args, env: {} };
    }
    case 'kimi':
      return { command: 'kimi', args: ['--prompt', effectivePrompt], env: {} };
    case 'grok':
      return { command: 'grok', args: ['--single', effectivePrompt], env: {} };
    case 'agy':
      throw new Error(
        'Antigravity is supported as an interactive origin host, but no stable headless delegation interface is verified. Choose opencode, codex, claude, kimi, zai, or grok.'
      );
    default:
      throw new Error(`Unsupported delegation target: ${target.id}`);
  }
}
