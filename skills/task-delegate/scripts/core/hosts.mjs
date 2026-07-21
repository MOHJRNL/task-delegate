import os from 'node:os';
import path from 'node:path';
import { mkdir, readFile, writeFile, stat, cp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const home = () => process.env.TASK_DELEGATE_HOME || os.homedir();

export const HOSTS = [
  { id: 'claude-code', name: 'Claude Code', binary: 'claude', invocation: '/task-delegate', skillsAgent: 'claude-code' },
  { id: 'codex', name: 'Codex CLI', binary: 'codex', invocation: '$task-delegate', skillsAgent: 'codex' },
  { id: 'opencode', name: 'OpenCode', binary: 'opencode', invocation: '/task-delegate', skillsAgent: 'opencode' },
  { id: 'antigravity', name: 'Antigravity', binary: 'agy', invocation: 'task-delegate skill', skillsAgent: 'antigravity' },
  { id: 'kimi', name: 'Kimi Code CLI', binary: 'kimi', invocation: 'task-delegate skill', skillsAgent: 'kimi' },
  { id: 'grok', name: 'Grok CLI', binary: 'grok', invocation: 'task-delegate skill', skillsAgent: 'grok' },
  { id: 'terminal', name: 'Terminal', binary: 'task-delegate', invocation: 'task-delegate delegate', builtIn: true }
];

export function manifestPath() { return path.join(home(), '.task-delegate', 'install-manifest.json'); }

export async function commandExists(binary) {
  return new Promise(resolve => {
    const p = spawn(process.platform === 'win32' ? 'where' : 'sh', process.platform === 'win32' ? [binary] : ['-lc', `command -v ${JSON.stringify(binary)}`], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('close', code => resolve(code === 0));
  });
}

function run(command, args, options = {}) {
  return new Promise(resolve => {
    const p = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout?.on('data', d => stdout += d);
    p.stderr?.on('data', d => stderr += d);
    p.on('error', error => resolve({ exitCode: 127, stdout, stderr: `${stderr}${error.message}` }));
    p.on('close', code => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

export async function installHosts({ dryRun = false, check = false } = {}) {
  const results = [];
  const installed = [];
  for (const host of HOSTS) {
    if (host.builtIn) {
      const available = await commandExists('task-delegate');
      results.push({ ...host, status: available ? 'ready' : 'missing-cli' });
      continue;
    }
    const detected = await commandExists(host.binary);
    if (!detected) {
      results.push({ ...host, status: 'host-cli-not-detected' });
      continue;
    }
    if (check) {
      results.push({ ...host, status: 'detected', note: 'Run setup without --check to install or refresh the portable skill.' });
      continue;
    }
    if (dryRun) {
      results.push({ ...host, status: 'would-install' });
      continue;
    }
    const r = await run('npx', ['--yes', 'skills', 'add', 'MOHJRNL/task-delegate', '--skill', 'task-delegate', '--global', '--agent', host.skillsAgent, '--yes']);
    const status = r.exitCode === 0 ? 'installed' : 'failed';
    results.push({ ...host, status, exitCode: r.exitCode, stderr: r.stderr.trim() || undefined });
    if (status === 'installed') installed.push(host.id);
  }
  if (!dryRun && !check) {
    const file = manifestPath();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'task-delegate.install.v1', version: '2.1.0', installedAt: new Date().toISOString(), installedHosts: installed }, null, 2)}\n`);
  }
  return results;
}

export async function uninstallHosts() {
  const file = manifestPath();
  let manifest = null;
  try { manifest = JSON.parse(await readFile(file, 'utf8')); } catch {}
  const results = [];
  for (const id of manifest?.installedHosts || []) {
    const host = HOSTS.find(h => h.id === id);
    if (!host) continue;
    const r = await run('npx', ['--yes', 'skills', 'remove', 'task-delegate', '--global', '--agent', host.skillsAgent, '--yes']);
    results.push({ host: id, status: r.exitCode === 0 ? 'removed' : 'failed', exitCode: r.exitCode, stderr: r.stderr.trim() || undefined });
  }
  await rm(file, { force: true });
  return results;
}
