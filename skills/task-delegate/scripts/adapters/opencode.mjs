export const backend = {
  name: 'opencode',
  status: 'supported',
  binary: 'opencode',
  defaultMode: 'safe-auto',
  supportedModes: ['plan', 'manual', 'safe-auto']
};

export function opencodePermissionProfile() {
  return {
    read: {
      '*': 'allow',
      '*.env': 'deny',
      '*.env.*': 'deny',
      '*.pem': 'deny',
      '*.key': 'deny',
      'id_rsa*': 'deny'
    },
    edit: {
      '*': 'allow',
      '*.env': 'deny',
      '*.env.*': 'deny',
      '*.pem': 'deny',
      '*.key': 'deny'
    },
    glob: 'allow',
    grep: 'allow',
    bash: {
      '*': 'ask',
      'git status*': 'allow',
      'git diff*': 'allow',
      'git log*': 'allow',
      'git show*': 'allow',
      'npm test*': 'allow',
      'npm run test*': 'allow',
      'npm run lint*': 'allow',
      'npm run build*': 'allow',
      'pnpm test*': 'allow',
      'pnpm run test*': 'allow',
      'pnpm run lint*': 'allow',
      'pnpm run build*': 'allow',
      'yarn test*': 'allow',
      'yarn lint*': 'allow',
      'yarn build*': 'allow',
      'git add*': 'deny',
      'git commit*': 'deny',
      'git push*': 'deny',
      'git reset*': 'deny',
      'git clean*': 'deny',
      'rm *': 'deny',
      'rm -rf*': 'deny',
      'curl *': 'ask',
      'wget *': 'ask'
    },
    webfetch: 'deny',
    websearch: 'deny',
    external_directory: 'deny',
    doom_loop: 'ask'
  };
}

export function buildInvocation({ prompt, mode, model }) {
  const args = ['run', '--format', 'json', '--title', 'TaskDelegate delegated run'];

  if (mode === 'safe-auto') args.push('--auto');
  if (mode === 'plan') args.push('--agent', 'plan');
  if (mode !== 'plan') args.push('--agent', 'build');
  if (model) args.push('--model', model);

  args.push(prompt);

  return {
    command: backend.binary,
    args,
    env: {
      OPENCODE_PERMISSION: JSON.stringify(opencodePermissionProfile()),
      OPENCODE_DISABLE_AUTOUPDATE: 'true',
      OPENCODE_DISABLE_PRUNE: 'true'
    },
    warnings: mode === 'safe-auto'
      ? ['OpenCode safe-auto uses --auto with OPENCODE_PERMISSION deny rules. Review is still required.']
      : []
  };
}
