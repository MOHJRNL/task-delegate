#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { stdout as output, stderr as errorOutput } from 'node:process';
import { fileURLToPath } from 'node:url';
import { HOSTS, installHosts, uninstallHosts, commandExists } from './core/hosts.mjs';
import { TARGETS } from './core/targets.mjs';
import { validateResultV2 } from './core/schema.mjs';

const localCliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../bin/task-delegate.mjs');
const DEFAULT_VERIFY_TIMEOUT_MS = 180_000;
const DEFAULT_JOBS = 2;

function parseInteger(value, flag, min) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) throw new Error(`${flag} must be an integer >= ${min}.`);
  return parsed;
}

function run(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 0;
  return new Promise(resolve => {
    const p = spawn(command, args, { ...options, timeoutMs: undefined, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false, settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    const timer = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      p.kill('SIGTERM');
      setTimeout(() => p.kill('SIGKILL'), 3000).unref();
    }, timeoutMs) : null;
    p.stdout.on('data', d => stdout += d);
    p.stderr.on('data', d => stderr += d);
    p.on('error', e => finish({ exitCode: 127, stdout, stderr: `${stderr}${e.message}`, timedOut }));
    p.on('close', c => finish({ exitCode: c ?? 1, stdout, stderr, timedOut }));
  });
}

async function git(cwd, ...args) { return run('git', args, { cwd, timeoutMs: 10_000 }); }

export async function hosts() {
  const rows = [];
  for (const h of HOSTS) rows.push({ id: h.id, name: h.name, detected: h.builtIn ? true : await commandExists(h.binary), invocation: h.invocation });
  console.log(JSON.stringify({ hosts: rows }, null, 2));
}

export async function doctor() {
  const hs = [];
  for (const h of HOSTS) hs.push({ ...h, detected: h.builtIn ? await commandExists('task-delegate') : await commandExists(h.binary) });
  const ts = [];
  for (const t of TARGETS) ts.push({ id: t.id, name: t.name, binary: t.binary, detected: await commandExists(t.binary) });
  console.log(JSON.stringify({ package: 'task-delegate', version: '2.1.0', node: process.version, adaptersBundled: true, backends: ts.map(t => t.id), hosts: hs, targets: ts }, null, 2));
}

function formatDuration(durationMs) {
  return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;
}

async function verifyTarget(target, { live, timeoutMs, machineOutput, index, total }) {
  const started = Date.now();
  const detected = await commandExists(target.binary);
  const item = { target: target.id, binary: target.binary, detected, live: false };
  if (!detected) {
    Object.assign(item, { status: 'failed', reason: 'binary-not-detected', durationMs: Date.now() - started });
    if (!machineOutput) errorOutput.write(`[${index}/${total}] ${target.name} failed — binary not detected\n`);
    return item;
  }
  if (!live) {
    Object.assign(item, { status: 'ready-for-live-verification', durationMs: Date.now() - started });
    if (!machineOutput) errorOutput.write(`[${index}/${total}] ${target.name} ready\n`);
    return item;
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), `task-delegate-${target.id}-`));
  try {
    await git(dir, 'init');
    await git(dir, 'config', 'user.email', 'task-delegate@example.invalid');
    await git(dir, 'config', 'user.name', 'TaskDelegate Test');
    await writeFile(path.join(dir, 'README.md'), 'fixture\n');
    await git(dir, 'add', '.');
    await git(dir, 'commit', '-m', 'fixture');
    const before = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
    const task = 'Create hello.txt containing exactly TaskDelegate smoke test followed by a newline. Modify no other tracked file. Do not commit or push.';
    const result = await run(process.execPath, [
      localCliPath, 'delegate', '--to', target.id, '--task', task, '--cd', dir,
      '--timeout-ms', String(timeoutMs), '--json'
    ], { cwd: dir, timeoutMs: timeoutMs + 10_000 });
    const after = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
    const content = await readFile(path.join(dir, 'hello.txt'), 'utf8').catch(() => null);
    const status = (await git(dir, 'status', '--porcelain')).stdout.trim().split('\n').filter(line => line && !line.includes('.task-delegate/'));
    const runRoot = path.join(dir, '.task-delegate', 'runs');
    const findResult = await run('sh', ['-lc', `find ${JSON.stringify(runRoot)} -name result.json -type f | sort | tail -1`], { timeoutMs: 10_000 });
    const resultPath = findResult.stdout.trim();
    const parsed = resultPath ? JSON.parse(await readFile(resultPath, 'utf8')) : null;
    const schema = validateResultV2(parsed);
    const exactContent = typeof content === 'string' && content.replace(/\r?\n$/, '') === 'TaskDelegate smoke test';
    Object.assign(item, {
      live: true,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      noCommitCreated: before === after,
      exactContent,
      changedFiles: status,
      schema,
      durationMs: Date.now() - started
    });
    item.status = result.exitCode === 0 && before === after && exactContent && schema.valid ? 'passed' : 'failed';
    if (result.timedOut) item.reason = 'timeout';
    if (!machineOutput) errorOutput.write(`[${index}/${total}] ${target.name} ${item.status} — ${formatDuration(item.durationMs)}\n`);
    return item;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function mapWithConcurrency(items, jobs, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, () => runWorker()));
  return results;
}

export async function verify({ live = false, targetId = null, jobs = DEFAULT_JOBS, timeoutMs = DEFAULT_VERIFY_TIMEOUT_MS, json = false } = {}) {
  const selected = targetId ? TARGETS.filter(t => t.id === targetId) : TARGETS;
  if (targetId && selected.length === 0) throw new Error(`Unknown target: ${targetId}`);
  const machineOutput = json || !output.isTTY;
  const report = await mapWithConcurrency(selected, jobs, (target, index) => verifyTarget(target, {
    live,
    timeoutMs,
    machineOutput,
    index: index + 1,
    total: selected.length
  }));
  const payload = { schemaVersion: 'task-delegate.verify.v1', live, jobs, timeoutMs, report };
  if (machineOutput) console.log(JSON.stringify(payload, null, 2));
  else {
    const livePassed = report.filter(
      x => x.status === 'passed' && x.live === true
    ).length;
    const ready = report.filter(
      x => x.status === 'ready-for-live-verification'
    ).length;
    const failed = report.filter(x => x.status === 'failed').length;

    console.log(
      `\nVerification complete: ${livePassed} live passed, ` +
      `${ready} awaiting live verification, ${failed} failed.`
    );
  }
  if (report.some(x => x.status === 'failed')) process.exitCode = 2;
  return payload;
}

export async function setup(args) { console.log(JSON.stringify({ setup: await installHosts(args) }, null, 2)); }
export async function uninstall() { console.log(JSON.stringify({ uninstall: await uninstallHosts() }, null, 2)); }
export async function update() {
  const r = await run('npm', ['install', '-g', 'task-delegate@latest'], { timeoutMs: 120_000 });
  if (r.exitCode !== 0) throw new Error(r.stderr || 'npm update failed');
  await setup({});
}

function printManagementHelp(command) {
  const help = {
    setup: `Usage: task-delegate setup [--check|--dry-run]\n\nInstalls the bundled TaskDelegate skill from the current package.\n  --check     Verify host binaries, installed skill paths, and versions.\n  --dry-run   Show what would be installed without changing files.`,
    verify: `Usage: task-delegate verify [--live] [--target <id>] [--jobs <n>] [--timeout-ms <n>] [--json]\n\n  --live             Run real bounded smoke tests.\n  --target <id>      Verify one target only.\n  --jobs <n>         Maximum concurrent targets. Default: 2.\n  --timeout-ms <n>   Per-target timeout. Default: 180000.\n  --json             Emit JSON only.`,
    doctor: 'Usage: task-delegate doctor',
    hosts: 'Usage: task-delegate hosts',
    update: 'Usage: task-delegate update',
    uninstall: 'Usage: task-delegate uninstall'
  };
  console.log(help[command] || 'Use task-delegate --help for available commands.');
}

function optionValue(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

const [command, ...argv] = process.argv.slice(2);
const flags = new Set(argv);
try {
  if (flags.has('--help') || flags.has('-h')) printManagementHelp(command);
  else if (command === 'setup') await setup({ check: flags.has('--check'), dryRun: flags.has('--dry-run') });
  else if (command === 'verify') await verify({
    live: flags.has('--live'),
    targetId: optionValue(argv, '--target', null),
    jobs: parseInteger(optionValue(argv, '--jobs', DEFAULT_JOBS), '--jobs', 1),
    timeoutMs: parseInteger(optionValue(argv, '--timeout-ms', DEFAULT_VERIFY_TIMEOUT_MS), '--timeout-ms', 1000),
    json: flags.has('--json')
  });
  else if (command === 'doctor') await doctor();
  else if (command === 'hosts') await hosts();
  else if (command === 'update') await update();
  else if (command === 'uninstall') await uninstall();
  else throw new Error(`Unknown management command: ${command || '(missing)'}`);
} catch (error) {
  console.error(`TaskDelegate error: ${error.message}`);
  process.exitCode = 1;
}
