export const backend = {
  name: 'claude',
  status: 'experimental',
  binary: 'claude',
  defaultMode: 'manual',
  supportedModes: ['plan', 'manual', 'safe-auto']
};

function permissionMode(mode) {
  if (mode === 'plan') return 'plan';
  if (mode === 'safe-auto') return 'acceptEdits';
  return 'default';
}

export function buildInvocation({ prompt, mode, model }) {
  const args = ['-p', prompt, '--permission-mode', permissionMode(mode)];
  if (model) args.push('--model', model);

  const warnings = [
    'Claude adapter is experimental in TaskDelegate v0.1.'
  ];

  if (mode === 'safe-auto') {
    warnings.push('Claude safe-auto maps to acceptEdits and is not recommended as default. Prefer manual or plan.');
  }

  return {
    command: backend.binary,
    args,
    env: {},
    warnings
  };
}
