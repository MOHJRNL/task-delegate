import { runProcess } from './utils.mjs';

export async function git(cwd, args) {
  return runProcess('git', args, { cwd, timeoutMs: 60_000 });
}

export async function isGitRepo(cwd) {
  const result = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
  return result.exitCode === 0 && result.stdout.trim() === 'true';
}

export async function statusPorcelain(cwd) {
  const result = await git(cwd, ['status', '--porcelain']);
  return result.exitCode === 0 ? result.stdout : '';
}

export async function dirty(cwd) {
  return (await statusPorcelain(cwd)).trim().length > 0;
}

export async function diffStat(cwd) {
  const result = await git(cwd, ['diff', '--stat']);
  return result.exitCode === 0 ? result.stdout : '';
}

export async function changedFiles(cwd) {
  const result = await git(cwd, ['diff', '--name-only']);
  if (result.exitCode !== 0) return [];
  return result.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
