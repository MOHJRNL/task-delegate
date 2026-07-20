#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import { changedFiles, diffStat, dirty, isGitRepo, statusPorcelain } from './lib/git.mjs';
import { commandExists, ensureDir, exists, nowIso, runProcess, safeTimestamp, writeText } from './lib/utils.mjs';
import { TARGETS, buildInvocation, getTarget } from './registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseOptions(argv) {
  const options = {
    to: undefined,
    task: undefined,
    cd: process.cwd(),
    mode: 'manual',
    model: undefined,
    timeoutMs: 30 * 60 * 1000,
    allowDirty: false,
    dryRun: false,
    json: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${token}`);
      i += 1;
      return argv[i];
    };
    switch (token) {
      case '--to': options.to = next(); break;
      case '--task': options.task = next(); break;
      case '--cd': options.cd = next(); break;
      case '--mode': options.mode = next(); break;
      case '--model': options.model = next(); break;
      case '--timeout-ms': options.timeoutMs = Number(next()); break;
      case '--allow-dirty': options.allowDirty = true; break;
      case '--dry-run': options.dryRun = true; break;
      case '--json': options.json = true; break;
      case '--help':
      case '-h': options.help = true; break;
      default: throw new Error(`Unknown argument: ${token}`);
    }
  }
  return options;
}

function buildPrompt(task, target) {
  return `# TaskDelegate delegated task\n\nTarget: ${target.name}\nMode: manual review\n\n## Hard rules\n- Do not commit or push.\n- Do not rewrite git history.\n- Do not read secrets or credential files.\n- Do not write outside the project directory.\n- Do not install packages unless the task explicitly requires it.\n- Keep changes limited to the requested task.\n- Return a concise summary, changed files, commands run, checks, and risks.\n\n## Task\n${task.trim()}\n`;
}

async function discoverTargets() {
  const results = [];
  for (const target of TARGETS) {
    results.push({
      ...target,
      available: target.status === 'coming-soon' ? false : await commandExists(target.binary)
    });
  }
  return results;
}

export async function printTargets({ json = false } = {}) {
  const targets = await discoverTargets();
  if (json) {
    console.log(JSON.stringify({ targets }, null, 2));
    return targets;
  }
  console.log('Available delegation targets\n');
  targets.forEach((target, index) => {
    const state = target.status === 'coming-soon' ? 'Coming soon' : target.available ? 'Ready' : 'Not available';
    console.log(`${index + 1}. ${target.name.padEnd(16)} ${state}`);
  });
  console.log('\nMode: Manual by default. Automatic delegation is coming soon.');
  return targets;
}

async function chooseInteractively(targets) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error('Missing --to. Interactive selection requires a terminal.');
  }
  await printTargets();
  const selectable = targets.filter((target) => target.available && target.status !== 'coming-soon');
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question('\nSelect a target number or id: ');
    const numeric = Number(answer);
    const selected = Number.isInteger(numeric) ? targets[numeric - 1] : getTarget(answer.trim().toLowerCase());
    if (!selected || !selectable.some((target) => target.id === selected.id)) {
      throw new Error(`Target is unavailable or invalid: ${answer}`);
    }
    return selected;
  } finally {
    rl.close();
  }
}

async function readTaskInteractively() {
  if (!input.isTTY || !output.isTTY) throw new Error('Missing --task. Interactive input requires a terminal.');
  const rl = readline.createInterface({ input, output });
  try {
    const task = await rl.question('Describe the task: ');
    if (!task.trim()) throw new Error('Task cannot be empty.');
    return task;
  } finally {
    rl.close();
  }
}

export async function delegate(argv) {
  const options = parseOptions(argv);
  if (options.help) {
    console.log(`TaskDelegate unified delegation\n\nUsage:\n  task-delegate delegate\n  task-delegate delegate --to codex --task "Fix failing tests" [options]\n  task-delegate targets [--json]\n\nOptions:\n  --to <opencode|codex|claude|agy|kimi|zai|grok>\n  --task <text>\n  --cd <path>\n  --mode <manual|plan>       Default: manual\n  --model <name>\n  --timeout-ms <number>\n  --allow-dirty\n  --dry-run\n  --json\n`);
    return;
  }
  if (!['manual', 'plan'].includes(options.mode)) {
    throw new Error("Only 'manual' and 'plan' are supported in v0.2. Automatic mode is coming soon.");
  }
  const projectDir = path.resolve(options.cd);
  if (!(await exists(projectDir))) throw new Error(`Project directory does not exist: ${projectDir}`);
  const targets = await discoverTargets();
  let target = options.to ? getTarget(options.to.toLowerCase()) : undefined;
  if (target?.status === 'coming-soon') throw new Error('Auto-select is coming soon. Choose an explicit target.');
  if (!target) target = await chooseInteractively(targets);
  const discovered = targets.find((item) => item.id === target.id);
  if (!discovered?.available) throw new Error(`${target.name} CLI is not available in PATH.`);
  const task = options.task || await readTaskInteractively();
  const gitRepo = await isGitRepo(projectDir);
  const statusBefore = gitRepo ? await statusPorcelain(projectDir) : '';
  const dirtyBefore = Boolean(statusBefore.trim());
  const runDir = path.join(projectDir, '.task-delegate', 'runs', `${safeTimestamp()}-${target.id}`);
  await ensureDir(runDir);
  if (dirtyBefore && !options.allowDirty) {
    const refused = { schemaVersion: 'task-delegate.result.v2', status: 'refused', target: target.id, mode: options.mode, reason: 'dirty-worktree', reviewRequired: true };
    await writeText(path.join(runDir, 'result.json'), `${JSON.stringify(refused, null, 2)}\n`);
    throw new Error(`Dirty worktree refused. Commit/stash changes or use --allow-dirty. Result: ${path.join(runDir, 'result.json')}`);
  }
  const prompt = buildPrompt(task, target);
  await writeText(path.join(runDir, 'brief.md'), `${task.trim()}\n`);
  await writeText(path.join(runDir, 'prompt.md'), prompt);
  const invocation = buildInvocation(target, { prompt, mode: options.mode, model: options.model });
  const startedAt = nowIso();
  const started = Date.now();
  const proc = options.dryRun
    ? { exitCode: 0, timedOut: false, stdout: '', stderr: '' }
    : await runProcess(invocation.command, invocation.args, {
        cwd: projectDir,
        env: { ...process.env, ...(invocation.env || {}) },
        timeoutMs: options.timeoutMs
      });
  await writeText(path.join(runDir, 'stdout.log'), proc.stdout || '');
  await writeText(path.join(runDir, 'stderr.log'), proc.stderr || '');
  const files = gitRepo ? await changedFiles(projectDir) : [];
  const stat = gitRepo ? await diffStat(projectDir) : '';
  const dirtyAfter = gitRepo ? await dirty(projectDir) : false;
  await writeText(path.join(runDir, 'changed-files.txt'), `${files.join('\n')}${files.length ? '\n' : ''}`);
  await writeText(path.join(runDir, 'diff-stat.txt'), stat);
  const result = {
    schemaVersion: 'task-delegate.result.v2',
    taskId: path.basename(runDir),
    status: proc.exitCode === 0 ? 'completed' : 'failed',
    target: target.id,
    targetName: target.name,
    mode: options.mode,
    startedAt,
    endedAt: nowIso(),
    durationMs: Date.now() - started,
    exitCode: proc.exitCode,
    timedOut: proc.timedOut,
    dryRun: options.dryRun,
    projectDir,
    runDir,
    changedFiles: files,
    git: { isGitRepo: gitRepo, dirtyBefore, dirtyAfter },
    artifacts: {
      brief: path.join(runDir, 'brief.md'),
      prompt: path.join(runDir, 'prompt.md'),
      stdout: path.join(runDir, 'stdout.log'),
      stderr: path.join(runDir, 'stderr.log'),
      diffStat: path.join(runDir, 'diff-stat.txt')
    },
    reviewRequired: true,
    commitAllowed: false,
    nextActions: ['accept', 'revise', 'cross-review', 'discard']
  };
  await writeText(path.join(runDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = proc.exitCode === null ? 1 : proc.exitCode;
}

export async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (command === 'targets') return printTargets({ json: argv.includes('--json') });
  return delegate(command === 'delegate' ? argv : process.argv.slice(2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`TaskDelegate error: ${error.message}`);
    process.exitCode = 1;
  });
}
