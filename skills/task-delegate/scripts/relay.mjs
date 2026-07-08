#!/usr/bin/env node
import path from 'node:path';
import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  commandExists,
  countLines,
  ensureDir,
  exists,
  nowIso,
  parseArgs,
  printHelp,
  readText,
  relativePath,
  runProcess,
  safeTimestamp,
  writeText
} from './lib/utils.mjs';
import { changedFiles, diffStat, dirty, isGitRepo, statusPorcelain } from './lib/git.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapters = {
  opencode: () => import('./adapters/opencode.mjs'),
  codex: () => import('./adapters/codex.mjs'),
  claude: () => import('./adapters/claude.mjs')
};

function buildGuardedPrompt({ brief, backend, mode }) {
  return `# TaskDelegate delegated implementation brief

You are a backend CLI coding agent receiving a bounded task from an orchestrator.

## Backend

- Backend: ${backend}
- Mode: ${mode}

## Hard rules

- Do not commit.
- Do not push.
- Do not run git reset, git clean, or rewrite history.
- Do not read .env files, key files, certificates, private tokens, or credentials.
- Do not write outside the project directory.
- Do not install packages unless explicitly allowed in the brief.
- Do not make unrelated changes.
- Keep output concise.

## Required final response

Return a short final response with:

- Summary
- Files changed
- Commands run
- Gates passed/failed/not run
- Unresolved risks

## Brief

${brief.trim()}
`;
}

const KNOWN_COMMANDS = new Set(['run', 'doctor', 'list-backends', 'skill-path', 'install-skill', 'init-brief', 'help']);

function splitCommand(argv) {
  const copy = [...argv];
  const first = copy[0];
  if (!first || first.startsWith('-')) return { command: 'run', argv: copy };
  if (!KNOWN_COMMANDS.has(first)) return { command: 'run', argv: copy };
  return { command: first, argv: copy.slice(1) };
}

function parseSimpleOptions(argv) {
  const opts = { dest: undefined, out: undefined, target: undefined, force: false, json: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${token}`);
      i += 1;
      return argv[i];
    };

    switch (token) {
      case '--dest': opts.dest = next(); break;
      case '--out': opts.out = next(); break;
      case '--target': opts.target = next(); break;
      case '--force': opts.force = true; break;
      case '--json': opts.json = true; break;
      case '--help':
      case '-h': opts.help = true; break;
      default: throw new Error(`Unknown argument: ${token}`);
    }
  }

  return opts;
}

async function loadBackendMetadata() {
  const entries = [];
  for (const [name, importer] of Object.entries(adapters)) {
    const mod = await importer();
    entries.push({
      name,
      status: mod.backend.status,
      binary: mod.backend.binary,
      defaultMode: mod.backend.defaultMode,
      supportedModes: mod.backend.supportedModes
    });
  }
  return entries;
}

async function runDoctor({ json = false } = {}) {
  const backendMeta = await loadBackendMetadata();
  const gitAvailable = await commandExists('git');
  const backends = [];
  for (const item of backendMeta) {
    backends.push({
      ...item,
      available: await commandExists(item.binary)
    });
  }

  const report = {
    package: 'task-delegate',
    node: process.version,
    gitAvailable,
    adaptersBundled: true,
    note: 'Adapters are bundled with TaskDelegate. Backend CLIs must still be installed and authenticated separately.',
    backends
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('TaskDelegate doctor');
  console.log(`Node: ${report.node}`);
  console.log(`Git: ${gitAvailable ? 'available' : 'missing'}`);
  console.log(`Adapters bundled: yes`);
  console.log('Backend CLIs:');
  for (const b of backends) {
    console.log(`- ${b.name} (${b.status}) -> ${b.binary}: ${b.available ? 'available' : 'missing'}; default=${b.defaultMode}`);
  }
}

async function runListBackends({ json = false } = {}) {
  const backendMeta = await loadBackendMetadata();
  if (json) {
    console.log(JSON.stringify({ backends: backendMeta }, null, 2));
    return;
  }
  console.log('TaskDelegate backends');
  for (const b of backendMeta) {
    console.log(`- ${b.name}: ${b.status}; binary=${b.binary}; default=${b.defaultMode}; modes=${b.supportedModes.join(',')}`);
  }
}

async function runSkillPath() {
  console.log(path.resolve(__dirname, '..'));
}

async function runInstallSkill(options) {
  const destRoot = path.resolve(options.dest || '.claude/skills');
  const source = path.resolve(__dirname, '..');
  const dest = path.join(destRoot, 'task-delegate');

  if ((await exists(dest)) && !options.force) {
    throw new Error(`Skill already exists at ${dest}. Pass --force to overwrite.`);
  }

  await ensureDir(destRoot);
  await cp(source, dest, { recursive: true, force: true });

  const result = {
    installed: true,
    skill: 'task-delegate',
    source,
    destination: dest,
    adaptersBundled: true,
    note: 'The skill scripts/adapters were copied. Backend CLIs such as opencode, codex, or claude must still be installed/authenticated separately.'
  };
  console.log(JSON.stringify(result, null, 2));
}

async function runInitBrief(options) {
  const outPath = path.resolve(options.out || 'task-delegate.brief.md');
  if ((await exists(outPath)) && !options.force) {
    throw new Error(`Brief already exists at ${outPath}. Pass --force to overwrite.`);
  }

  const templatePath = path.resolve(__dirname, '..', 'references', 'brief-template.md');
  const template = await readText(templatePath);
  await writeText(outPath, template);
  console.log(JSON.stringify({ created: true, brief: outPath }, null, 2));
}

function defaultModeForBackend(name, backendModule) {
  return backendModule.backend.defaultMode || (name === 'opencode' ? 'safe-auto' : 'manual');
}

function validateMode({ backendName, backendModule, mode, force }) {
  const supported = backendModule.backend.supportedModes || [];
  if (!supported.includes(mode)) {
    throw new Error(`Backend ${backendName} does not support mode '${mode}'. Supported: ${supported.join(', ')}`);
  }

  if (backendName !== 'opencode' && mode === 'safe-auto' && !force) {
    throw new Error(`${backendName} safe-auto is not enabled by default. Use --force if you explicitly accept experimental auto-like behavior.`);
  }
}

async function main() {
  const { command, argv } = splitCommand(process.argv.slice(2));

  if (command === 'help') {
    printHelp();
    return;
  }

  if (command === 'doctor') {
    const options = parseSimpleOptions(argv);
    if (options.help) { printHelp(); return; }
    await runDoctor({ json: options.json });
    return;
  }

  if (command === 'list-backends') {
    const options = parseSimpleOptions(argv);
    if (options.help) { printHelp(); return; }
    await runListBackends({ json: options.json });
    return;
  }

  if (command === 'skill-path') {
    await runSkillPath();
    return;
  }

  if (command === 'install-skill') {
    const options = parseSimpleOptions(argv);
    if (options.help) { printHelp(); return; }
    await runInstallSkill(options);
    return;
  }

  if (command === 'init-brief') {
    const options = parseSimpleOptions(argv);
    if (options.help) { printHelp(); return; }
    await runInitBrief(options);
    return;
  }

  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.brief) {
    printHelp();
    throw new Error('Missing required --brief path.');
  }

  if (!Number.isFinite(args.maxBriefLines) || args.maxBriefLines < 1) {
    throw new Error('--max-brief-lines must be a positive number.');
  }

  const backendName = args.backend;
  if (!adapters[backendName]) {
    throw new Error(`Unsupported backend '${backendName}'. Supported: ${Object.keys(adapters).join(', ')}`);
  }

  const projectDir = path.resolve(args.cd);
  if (!(await exists(projectDir))) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }

  const briefPath = path.resolve(args.brief);
  if (!(await exists(briefPath))) {
    throw new Error(`Brief file does not exist: ${briefPath}`);
  }

  const backendModule = await adapters[backendName]();
  const mode = args.mode || defaultModeForBackend(backendName, backendModule);
  validateMode({ backendName, backendModule, mode, force: args.force });

  const brief = await readText(briefPath);
  const briefLines = countLines(brief);
  if (briefLines > args.maxBriefLines && !args.force) {
    throw new Error(`Brief is ${briefLines} lines, above max ${args.maxBriefLines}. Shorten it or pass --force.`);
  }

  const runDir = path.resolve(args.out || path.join(projectDir, '.task-delegate', 'runs', `${safeTimestamp()}-${backendName}`));
  await ensureDir(runDir);

  const startedAt = nowIso();
  const startTime = Date.now();
  const warnings = [];

  const gitRepo = await isGitRepo(projectDir);
  if (!gitRepo) {
    warnings.push('Project directory is not a git repository. Diff metadata will be incomplete.');
  }

  const statusBefore = gitRepo ? await statusPorcelain(projectDir) : '';
  const dirtyBefore = statusBefore.trim().length > 0;
  await writeText(path.join(runDir, 'git-before.txt'), statusBefore);

  if (dirtyBefore && !args.allowDirty) {
    const result = {
      schemaVersion: '0.1',
      skill: 'task-delegate',
      backend: backendName,
      backendStatus: backendModule.backend.status,
      mode,
      projectDir,
      runDir,
      startedAt,
      endedAt: nowIso(),
      durationMs: Date.now() - startTime,
      exitCode: 2,
      timedOut: false,
      dryRun: args.dryRun,
      brief: {
        path: relativePath(projectDir, briefPath),
        lines: briefLines,
        maxLines: args.maxBriefLines
      },
      git: {
        isGitRepo: gitRepo,
        dirtyBefore,
        dirtyAfter: dirtyBefore,
        changedFiles: [],
        diffStatPath: relativePath(runDir, path.join(runDir, 'diff-stat.txt')),
        changedFilesPath: relativePath(runDir, path.join(runDir, 'changed-files.txt'))
      },
      artifacts: {
        promptPath: relativePath(runDir, path.join(runDir, 'prompt.md')),
        stdoutPath: relativePath(runDir, path.join(runDir, 'stdout.log')),
        stderrPath: relativePath(runDir, path.join(runDir, 'stderr.log'))
      },
      warnings: [
        ...warnings,
        'Refused to run because git working tree is dirty. Commit/stash changes or pass --allow-dirty.'
      ],
      reviewRequired: true,
      commitAllowed: false
    };

    await writeText(path.join(runDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.error(`TaskDelegate refused dirty worktree. Result: ${path.join(runDir, 'result.json')}`);
    process.exitCode = 2;
    return;
  }

  const prompt = buildGuardedPrompt({ brief, backend: backendName, mode });
  await writeText(path.join(runDir, 'prompt.md'), prompt);

  let invocation = null;
  let procResult = {
    command: '',
    args: [],
    cwd: projectDir,
    exitCode: 0,
    stdout: '',
    stderr: '',
    timedOut: false
  };

  if (args.dryRun) {
    warnings.push('Dry run: backend was not launched.');
  } else {
    invocation = backendModule.buildInvocation({ prompt, mode, model: args.model });
    warnings.push(...(invocation.warnings || []));

    const existsBackend = await commandExists(invocation.command);
    if (!existsBackend) {
      throw new Error(`Backend CLI not found in PATH: ${invocation.command}`);
    }

    const env = {
      ...process.env,
      ...(invocation.env || {})
    };

    procResult = await runProcess(invocation.command, invocation.args, {
      cwd: projectDir,
      env,
      timeoutMs: args.timeoutMs
    });
  }

  await writeText(path.join(runDir, 'stdout.log'), procResult.stdout || '');
  await writeText(path.join(runDir, 'stderr.log'), procResult.stderr || '');

  const statusAfter = gitRepo ? await statusPorcelain(projectDir) : '';
  const dirtyAfter = gitRepo ? await dirty(projectDir) : false;
  const filesChanged = gitRepo ? await changedFiles(projectDir) : [];
  const stat = gitRepo ? await diffStat(projectDir) : '';

  await writeText(path.join(runDir, 'git-after.txt'), statusAfter);
  await writeText(path.join(runDir, 'changed-files.txt'), `${filesChanged.join('\n')}${filesChanged.length ? '\n' : ''}`);
  await writeText(path.join(runDir, 'diff-stat.txt'), stat);

  const endedAt = nowIso();
  const result = {
    schemaVersion: '0.1',
    skill: 'task-delegate',
    backend: backendName,
    backendStatus: backendModule.backend.status,
    mode,
    projectDir,
    runDir,
    startedAt,
    endedAt,
    durationMs: Date.now() - startTime,
    exitCode: procResult.exitCode,
    timedOut: procResult.timedOut,
    dryRun: args.dryRun,
    command: invocation ? invocation.command : null,
    commandArgsPreview: invocation ? invocation.args.slice(0, -1) : [],
    brief: {
      path: relativePath(projectDir, briefPath),
      lines: briefLines,
      maxLines: args.maxBriefLines
    },
    git: {
      isGitRepo: gitRepo,
      dirtyBefore,
      dirtyAfter,
      changedFiles: filesChanged,
      diffStatPath: relativePath(runDir, path.join(runDir, 'diff-stat.txt')),
      changedFilesPath: relativePath(runDir, path.join(runDir, 'changed-files.txt'))
    },
    artifacts: {
      promptPath: relativePath(runDir, path.join(runDir, 'prompt.md')),
      stdoutPath: relativePath(runDir, path.join(runDir, 'stdout.log')),
      stderrPath: relativePath(runDir, path.join(runDir, 'stderr.log')),
      gitBeforePath: relativePath(runDir, path.join(runDir, 'git-before.txt')),
      gitAfterPath: relativePath(runDir, path.join(runDir, 'git-after.txt'))
    },
    warnings,
    reviewRequired: true,
    commitAllowed: false
  };

  await writeText(path.join(runDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

  console.log(JSON.stringify({
    status: procResult.exitCode === 0 ? 'completed' : 'failed',
    backend: backendName,
    mode,
    runDir,
    resultPath: path.join(runDir, 'result.json'),
    changedFiles: filesChanged.length,
    reviewRequired: true
  }, null, 2));

  process.exitCode = procResult.exitCode === null ? 1 : procResult.exitCode;
}

main().catch((error) => {
  console.error(`TaskDelegate error: ${error.message}`);
  process.exitCode = 1;
});
