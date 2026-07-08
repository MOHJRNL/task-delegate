export const backend = {
  name: 'codex',
  status: 'experimental',
  binary: 'codex',
  defaultMode: 'manual',
  supportedModes: ['plan', 'manual']
};

export function buildInvocation({ prompt, mode, model }) {
  const effectivePrompt = mode === 'plan'
    ? `PLAN MODE ONLY. Do not edit files. Do not run destructive commands. Produce a concise implementation plan.\n\n${prompt}`
    : prompt;

  const args = ['exec'];
  if (model) args.push('-m', model);
  args.push(effectivePrompt);

  return {
    command: backend.binary,
    args,
    env: {},
    warnings: [
      'Codex adapter is experimental in TaskDelegate v0.1.',
      'TaskDelegate does not use dangerous bypass/yolo modes for Codex.'
    ]
  };
}
