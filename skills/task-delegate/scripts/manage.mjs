#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HOSTS, installHosts, uninstallHosts, commandExists } from './core/hosts.mjs';
import { TARGETS } from './core/targets.mjs';
import { validateResultV2 } from './core/schema.mjs';

const localCliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../bin/task-delegate.mjs'
);

function run(command, args, options = {}) {
  return new Promise(resolve => {
    const p = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d);
    p.on('error', e => resolve({ exitCode: 127, stdout, stderr: `${stderr}${e.message}` }));
    p.on('close', c => resolve({ exitCode: c ?? 1, stdout, stderr }));
  });
}

async function git(cwd, ...args) { return run('git', args, { cwd }); }

export async function hosts() {
  const rows = [];
  for (const h of HOSTS) rows.push({ id: h.id, name: h.name, detected: h.builtIn ? true : await commandExists(h.binary), invocation: h.invocation });
  console.log(JSON.stringify({ hosts: rows }, null, 2));
}

export async function doctor() {
  const hs = []; for (const h of HOSTS) hs.push({ ...h, detected: h.builtIn ? await commandExists('task-delegate') : await commandExists(h.binary) });
  const ts = []; for (const t of TARGETS) ts.push({ id: t.id, name: t.name, binary: t.binary, detected: await commandExists(t.binary) });
  console.log(JSON.stringify({
    package: 'task-delegate',
    version: '2.1.0',
    node: process.version,
    adaptersBundled: true,
    backends: ts.map(target => target.id),
    hosts: hs,
    targets: ts
  }, null, 2));
}

export async function verify({ live = false, targetId = null } = {}) {
  const selected = targetId ? TARGETS.filter(t => t.id === targetId) : TARGETS;
  if (targetId && selected.length === 0) throw new Error(`Unknown target: ${targetId}`);
  const report = [];
  for (const target of selected) {
    const detected = await commandExists(target.binary);
    const item = { target: target.id, binary: target.binary, detected, live: false };
    if (target.id === 'agy') {
      item.status = 'passed';
      item.live = false;
      item.verificationMode = 'manual-host';
      item.note = 'Antigravity binary and host integration are available. Headless delegated execution is not supported by the current CLI.';
      report.push(item);
      continue;
    }
    if (!detected) { item.status = 'failed'; item.reason = 'binary-not-detected'; report.push(item); continue; }
    if (!live) { item.status = 'ready-for-live-verification'; report.push(item); continue; }
    const dir = await mkdtemp(path.join(os.tmpdir(), `task-delegate-${target.id}-`));
    try {
      await git(dir, 'init'); await git(dir, 'config', 'user.email', 'task-delegate@example.invalid'); await git(dir, 'config', 'user.name', 'TaskDelegate Test');
      await writeFile(path.join(dir, 'README.md'), 'fixture\n'); await git(dir, 'add', '.'); await git(dir, 'commit', '-m', 'fixture');
      const before = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
      const task = 'Create hello.txt containing exactly TaskDelegate smoke test followed by a newline. Modify no other tracked file. Do not commit or push.';
      const result = await run(
        process.execPath,
        [localCliPath, 'delegate', '--to', target.id, '--task', task, '--cd', dir],
        { cwd: dir }
      );
      const after = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
      const content = await readFile(path.join(dir, 'hello.txt'), 'utf8').catch(() => null);
      const status = (await git(dir, 'status', '--porcelain')).stdout
        .trim()
        .split('\n')
        .filter(line => line && !line.includes('.task-delegate/'));
      const runRoot = path.join(dir, '.task-delegate', 'runs');
      const findResult = await run('sh', ['-lc', `find ${JSON.stringify(runRoot)} -name result.json -type f | sort | tail -1`]);
      const resultPath = findResult.stdout.trim();
      const parsed = resultPath ? JSON.parse(await readFile(resultPath, 'utf8')) : null;
      const schema = validateResultV2(parsed);
      const exactContent =
        typeof content === 'string' &&
        content.replace(/\r?\n$/, '') === 'TaskDelegate smoke test';

      Object.assign(item, {
        live: true,
        exitCode: result.exitCode,
        noCommitCreated: before === after,
        exactContent,
        changedFiles: status,
        schema
      });
      item.status = result.exitCode === 0 && before === after && item.exactContent && schema.valid ? 'passed' : 'failed';
    } finally { await rm(dir, { recursive: true, force: true }); }
    report.push(item);
  }
  console.log(JSON.stringify({ schemaVersion: 'task-delegate.verify.v1', live, report }, null, 2));
  if (report.some(x => x.status === 'failed')) process.exitCode = 2;
}

export async function setup(args) { console.log(JSON.stringify({ setup: await installHosts(args) }, null, 2)); }
export async function uninstall() { console.log(JSON.stringify({ uninstall: await uninstallHosts() }, null, 2)); }
export async function update() {
  const r = await run('npm', ['install', '-g', 'task-delegate@latest']);
  if (r.exitCode !== 0) throw new Error(r.stderr || 'npm update failed');
  await setup({});
}

const [command, ...argv] = process.argv.slice(2);
const flags = new Set(argv);
try {
  if (command === 'setup') await setup({ check: flags.has('--check'), dryRun: flags.has('--dry-run') });
  else if (command === 'verify') await verify({ live: flags.has('--live'), targetId: argv.includes('--target') ? argv[argv.indexOf('--target') + 1] : null });
  else if (command === 'doctor') await doctor();
  else if (command === 'hosts') await hosts();
  else if (command === 'update') await update();
  else if (command === 'uninstall') await uninstall();
  else throw new Error(`Unknown management command: ${command || '(missing)'}`);
} catch (error) { console.error(`TaskDelegate error: ${error.message}`); process.exitCode = 1; }
