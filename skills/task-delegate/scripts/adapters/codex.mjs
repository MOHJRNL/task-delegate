export const backend = {
  name: 'codex',
  status: 'supported',
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
      'Codex runs with bounded workspace-write access. Review the resulting diff.'
    ]
  };
}
