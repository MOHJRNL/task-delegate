import os from 'node:os';
import path from 'node:path';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_VERSION = '2.1.0';
const home = () => process.env.TASK_DELEGATE_HOME || os.homedir();
const localSkillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const HOSTS = [
  { id: 'claude-code', name: 'Claude Code', binary: 'claude', invocation: '/task-delegate', installKind: 'copy', installPath: () => path.join(home(), '.claude', 'skills', 'task-delegate') },
  { id: 'codex', name: 'Codex CLI', binary: 'codex', invocation: '$task-delegate', installKind: 'shared', installPath: () => path.join(home(), '.agents', 'skills', 'task-delegate') },
  { id: 'opencode', name: 'OpenCode', binary: 'opencode', invocation: '/task-delegate', installKind: 'shared', installPath: () => path.join(home(), '.agents', 'skills', 'task-delegate') },
  { id: 'antigravity', name: 'Antigravity', binary: 'agy', invocation: 'task-delegate skill', installKind: 'shared', installPath: () => path.join(home(), '.agents', 'skills', 'task-delegate') },
  { id: 'kimi', name: 'Kimi Code CLI', binary: 'kimi', invocation: 'task-delegate skill', installKind: 'shared', installPath: () => path.join(home(), '.agents', 'skills', 'task-delegate') },
  { id: 'grok', name: 'Grok CLI', binary: 'grok', invocation: 'task-delegate skill', installKind: 'copy', installPath: () => path.join(home(), '.grok', 'skills', 'task-delegate') },
  { id: 'terminal', name: 'Terminal', binary: 'task-delegate', invocation: 'task-delegate delegate', builtIn: true }
];

export function manifestPath() {
  return path.join(home(), '.task-delegate', 'install-manifest.json');
}

export function bundledSkillPath() {
  return localSkillDir;
}

export async function commandExists(binary) {
  return new Promise(resolve => {
    const command = process.platform === 'win32' ? 'where' : 'sh';
    const args = process.platform === 'win32' ? [binary] : ['-lc', `command -v ${JSON.stringify(binary)}`];
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function skillVersion(skillDir) {
  try {
    const content = await readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
    return content.match(/^\s*version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] || null;
  } catch {
    return null;
  }
}

async function inspectHost(host) {
  if (host.builtIn) {
    const binaryDetected = await commandExists('task-delegate');
    return { ...host, binaryDetected, status: binaryDetected ? 'ready' : 'missing-cli' };
  }

  const binaryDetected = await commandExists(host.binary);
  const installPath = host.installPath();
  const skillInstalled = await exists(path.join(installPath, 'SKILL.md'));
  const installedVersion = skillInstalled ? await skillVersion(installPath) : null;
  const versionMatches = installedVersion === EXPECTED_VERSION;
  const status = !binaryDetected
    ? 'host-cli-not-detected'
    : !skillInstalled
      ? 'skill-not-installed'
      : !versionMatches
        ? 'version-mismatch'
        : 'ready';

  return {
    ...host,
    installPath,
    binaryDetected,
    skillInstalled,
    installedVersion,
    expectedVersion: EXPECTED_VERSION,
    versionMatches,
    status
  };
}

export async function installHosts({ dryRun = false, check = false } = {}) {
  const results = [];
  const installedPaths = new Set();
  const installedHosts = [];

  for (const host of HOSTS) {
    if (host.builtIn) {
      results.push(await inspectHost(host));
      continue;
    }

    const binaryDetected = await commandExists(host.binary);
    const installPath = host.installPath();

    if (check) {
      results.push(await inspectHost(host));
      continue;
    }

    if (!binaryDetected) {
      results.push({ ...host, installPath, binaryDetected: false, status: 'host-cli-not-detected' });
      continue;
    }

    if (dryRun) {
      results.push({ ...host, installPath, binaryDetected: true, source: localSkillDir, status: 'would-install' });
      continue;
    }

    try {
      if (!installedPaths.has(installPath)) {
        await rm(installPath, { recursive: true, force: true });
        await mkdir(path.dirname(installPath), { recursive: true });
        await cp(localSkillDir, installPath, { recursive: true, force: true });
        installedPaths.add(installPath);
      }

      const installedVersion = await skillVersion(installPath);
      const versionMatches = installedVersion === EXPECTED_VERSION;
      results.push({
        ...host,
        installPath,
        source: localSkillDir,
        binaryDetected: true,
        skillInstalled: true,
        installedVersion,
        expectedVersion: EXPECTED_VERSION,
        versionMatches,
        status: versionMatches ? 'installed' : 'failed'
      });
      if (versionMatches) installedHosts.push(host.id);
    } catch (error) {
      results.push({ ...host, installPath, source: localSkillDir, binaryDetected: true, status: 'failed', error: error.message });
    }
  }

  if (!dryRun && !check) {
    const file = manifestPath();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({
      schemaVersion: 'task-delegate.install.v2',
      version: EXPECTED_VERSION,
      source: localSkillDir,
      installedAt: new Date().toISOString(),
      installedHosts,
      installedPaths: [...installedPaths]
    }, null, 2)}\n`);
  }

  return results;
}

export async function uninstallHosts() {
  const file = manifestPath();
  let manifest = null;
  try {
    manifest = JSON.parse(await readFile(file, 'utf8'));
  } catch {}

  const paths = new Set(manifest?.installedPaths || []);
  if (paths.size === 0) {
    for (const host of HOSTS) {
      if (!host.builtIn) paths.add(host.installPath());
    }
  }

  const results = [];
  for (const installPath of paths) {
    try {
      await rm(installPath, { recursive: true, force: true });
      results.push({ installPath, status: 'removed' });
    } catch (error) {
      results.push({ installPath, status: 'failed', error: error.message });
    }
  }

  await rm(file, { force: true });
  return results;
}
