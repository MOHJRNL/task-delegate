export const TARGETS = [
  { id: 'opencode', name: 'OpenCode', binary: 'opencode', status: 'supported', defaultMode: 'manual' },
  { id: 'codex', name: 'Codex', binary: 'codex', status: 'supported', defaultMode: 'manual' },
  { id: 'claude', name: 'Claude Code', binary: 'claude', status: 'supported', defaultMode: 'manual' },
  { id: 'kimi', name: 'Kimi', binary: 'kimi', status: 'supported', defaultMode: 'manual' },
  { id: 'zai', name: 'z.ai', binary: 'opencode', status: 'supported', defaultMode: 'manual', defaultModel: 'zai-coding-plan/glm-4.7' },
  { id: 'grok', name: 'Grok', binary: 'grok', status: 'supported', defaultMode: 'manual' },
  { id: 'agy', name: 'Antigravity', binary: 'agy', status: 'supported', defaultMode: 'manual', headless: true }
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
    case 'agy': {
      const args = [
        '--print',
        effectivePrompt,
        '--mode',
        mode === 'plan' ? 'plan' : 'accept-edits',
        '--print-timeout',
        '3m',
        '--sandbox',
        '--dangerously-skip-permissions',
        '--output-format',
        'json'
      ];
      if (effectiveModel) args.push('--model', effectiveModel);
      return {
        command: 'agy',
        args,
        env: {},
        warnings: [
          'Antigravity headless mode uses sandboxed auto-approval so it cannot block on permission prompts. Review every diff.'
        ]
      };
    }
    default:
      throw new Error(`Unsupported delegation target: ${target.id}`);
  }
}
