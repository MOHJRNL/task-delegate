import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export function nowIso() {
  return new Date().toISOString();
}

export function safeTimestamp() {
  return nowIso().replace(/[:.]/g, '-');
}

export async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

export async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
}

export function countLines(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

export function parseArgs(argv) {
  const args = {
    backend: 'opencode',
    mode: undefined,
    brief: undefined,
    cd: process.cwd(),
    out: undefined,
    model: undefined,
    timeoutMs: 30 * 60 * 1000,
    maxBriefLines: 120,
    allowDirty: false,
    dryRun: false,
    force: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${token}`);
      i += 1;
      return argv[i];
    };

    switch (token) {
      case '--backend': args.backend = next(); break;
      case '--mode': args.mode = next(); break;
      case '--brief': args.brief = next(); break;
      case '--cd': args.cd = next(); break;
      case '--out': args.out = next(); break;
      case '--model': args.model = next(); break;
      case '--timeout-ms': args.timeoutMs = Number(next()); break;
      case '--max-brief-lines': args.maxBriefLines = Number(next()); break;
      case '--allow-dirty': args.allowDirty = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '--force': args.force = true; break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

export function printHelp() {
  console.log(`TaskDelegate CLI

Usage:
  task-delegate run --brief brief.md [options]
  task-delegate doctor [--json]
  task-delegate list-backends [--json]
  task-delegate init-brief [--out brief.md]
  task-delegate install-skill [--dest .claude/skills]
  task-delegate skill-path

Run options:
  --backend <opencode|codex|claude>  Backend adapter. Default: opencode
  --mode <plan|manual|safe-auto>     Execution mode. Default depends on backend
  --brief <path>                     Required task brief path
  --cd <path>                        Project directory. Default: current directory
  --out <path>                       Output run directory
  --model <name>                     Optional backend model name
  --timeout-ms <number>              Timeout. Default: 1800000
  --max-brief-lines <number>         Default: 120
  --allow-dirty                      Allow starting with dirty git worktree
  --dry-run                          Build prompt/result skeleton without launching backend
  --force                            Allow experimental/risky mode combinations or overwrite files
  --help                             Show this help

Examples:
  npx task-delegate doctor
  npx task-delegate init-brief --out brief.md
  npx task-delegate run --backend opencode --mode safe-auto --brief brief.md --cd .
  npx task-delegate run --backend codex --mode manual --brief brief.md --cd .
  npx task-delegate install-skill --dest .claude/skills
`);
}

export function runProcess(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    timeoutMs = 30 * 60 * 1000,
    stdin = undefined
  } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000).unref();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ command, args, cwd, exitCode: 127, stdout, stderr: `${stderr}\n${error.message}`, timedOut });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command, args, cwd, exitCode, stdout, stderr, timedOut });
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

export async function commandExists(command) {
  const probe = process.platform === 'win32'
    ? await runProcess('where', [command], { timeoutMs: 5000 })
    : await runProcess('command', ['-v', command], { timeoutMs: 5000, env: process.env });

  if (process.platform !== 'win32' && probe.exitCode === 127) {
    const fallback = await runProcess('which', [command], { timeoutMs: 5000 });
    return fallback.exitCode === 0;
  }

  return probe.exitCode === 0;
}

export function relativePath(fromDir, targetPath) {
  return path.relative(fromDir, targetPath) || '.';
}
