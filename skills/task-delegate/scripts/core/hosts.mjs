import os from 'node:os';
import path from 'node:path';
import { cp, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PACKAGE_VERSION = '2.1.0';
const home = () => process.env.TASK_DELEGATE_HOME || os.homedir();
const skillSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const installPath = relativePath => path.join(home(), relativePath, 'task-delegate');

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function assertSafeDestination(destination, { createParent = false } = {}) {
  const configuredHome = path.resolve(home());
  if (configuredHome === path.parse(configuredHome).root) {
    throw new Error(`Refusing unsafe TaskDelegate home: ${configuredHome}`);
  }

  if (createParent) {
    await mkdir(configuredHome, { recursive: true });
    await mkdir(path.dirname(destination), { recursive: true });
  }

  const canonicalHome = await realpath(configuredHome);
  const canonicalParent = await realpath(path.dirname(destination));
  const resolvedDestination = path.resolve(destination);

  if (!isWithin(canonicalHome, canonicalParent) || !isWithin(configuredHome, resolvedDestination)) {
    throw new Error(`Refusing install path outside TaskDelegate home: ${destination}`);
  }

  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink()) {
      throw new Error(`Refusing symlinked skill destination: ${destination}`);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export const HOSTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    binary: 'claude',
    invocation: '/task-delegate',
    installKind: 'copy',
    installPath: () => installPath('.claude/skills')
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    invocation: '$task-delegate',
    installKind: 'shared',
    installPath: () => installPath('.agents/skills')
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    invocation: '/task-delegate',
    installKind: 'shared',
    installPath: () => installPath('.agents/skills')
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    binary: 'agy',
    invocation: 'Use task-delegate',
    installKind: 'copy',
    installPath: () => installPath('.gemini/antigravity-cli/skills')
  },
  {
    id: 'kimi',
    name: 'Kimi Code CLI',
    binary: 'kimi',
    invocation: 'Use task-delegate',
    installKind: 'shared',
    installPath: () => installPath('.agents/skills')
  },
  {
    id: 'grok',
    name: 'Grok CLI',
    binary: 'grok',
    invocation: 'Use task-delegate',
    installKind: 'copy',
    installPath: () => installPath('.grok/skills')
  },
  {
    id: 'terminal',
    name: 'Terminal',
    binary: 'task-delegate',
    invocation: 'task-delegate delegate',
    builtIn: true
  }
];

export function manifestPath() {
  return path.join(home(), '.task-delegate', 'install-manifest.json');
}

export async function commandExists(binary) {
  return new Promise(resolve => {
    const command = process.platform === 'win32' ? 'where' : 'sh';
    const args = process.platform === 'win32'
      ? [binary]
      : ['-lc', `command -v ${JSON.stringify(binary)}`];
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

async function installedVersion(destination) {
  try {
    const source = await readFile(path.join(destination, 'SKILL.md'), 'utf8');
    return source.match(/^\s*version:\s*["']?([^"'\s]+)["']?/m)?.[1] || null;
  } catch {
    return null;
  }
}

async function inspectHost(host) {
  if (host.builtIn) {
    return {
      ...host,
      binaryDetected: await commandExists('task-delegate'),
      status: 'ready'
    };
  }

  const destination = host.installPath();
  const binaryDetected = await commandExists(host.binary);
  const version = await installedVersion(destination);
  const skillInstalled = version !== null;
  const versionMatches = version === PACKAGE_VERSION;

  return {
    id: host.id,
    name: host.name,
    binary: host.binary,
    invocation: host.invocation,
    installKind: host.installKind,
    installPath: destination,
    binaryDetected,
    skillInstalled,
    installedVersion: version,
    expectedVersion: PACKAGE_VERSION,
    versionMatches,
    status: binaryDetected && skillInstalled && versionMatches ? 'ready' : 'not-ready'
  };
}

export async function installHosts({ dryRun = false, check = false } = {}) {
  const results = [];
  const copiedDestinations = new Set();

  for (const host of HOSTS) {
    if (host.builtIn) {
      results.push(await inspectHost(host));
      continue;
    }

    const destination = host.installPath();
    const binaryDetected = await commandExists(host.binary);

    if (check) {
      results.push(await inspectHost(host));
      continue;
    }

    if (dryRun) {
      results.push({
        id: host.id,
        name: host.name,
        binary: host.binary,
        invocation: host.invocation,
        installKind: host.installKind,
        installPath: destination,
        binaryDetected,
        source: skillSource,
        status: 'would-install'
      });
      continue;
    }

    if (!copiedDestinations.has(destination)) {
      await assertSafeDestination(destination, { createParent: true });
      await rm(destination, { recursive: true, force: true });
      await cp(skillSource, destination, { recursive: true });
      copiedDestinations.add(destination);
    }

    const inspected = await inspectHost(host);
    results.push({ ...inspected, source: skillSource, status: inspected.versionMatches ? 'installed' : 'failed' });
  }

  if (!dryRun && !check) {
    const file = manifestPath();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({
      schemaVersion: 'task-delegate.install.v2',
      version: PACKAGE_VERSION,
      installedAt: new Date().toISOString(),
      installations: HOSTS
        .filter(host => !host.builtIn)
        .map(host => ({ host: host.id, path: host.installPath() }))
    }, null, 2)}\n`);
  }

  return results;
}

export async function uninstallHosts() {
  const destinations = [...new Set(
    HOSTS.filter(host => !host.builtIn).map(host => host.installPath())
  )];

  const results = [];
  for (const destination of destinations) {
    await assertSafeDestination(destination);
    await rm(destination, { recursive: true, force: true });
    results.push({ path: destination, status: 'removed' });
  }

  await rm(manifestPath(), { force: true });
  return results;
}
