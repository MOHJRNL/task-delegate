import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { runProcess } from '../skills/task-delegate/scripts/lib/utils.mjs';

function run(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', exitCode => resolve({ exitCode, stdout, stderr }));
  });
}

async function fakeBinary(dir, name, body = '#!/bin/sh\nexit 0\n') {
  const file = path.join(dir, name);
  await writeFile(file, body);
  await chmod(file, 0o755);
  return file;
}

test('runProcess bounds captured stdout and reports truncation', async () => {
  const result = await runProcess(process.execPath, ['-e', "process.stdout.write('x'.repeat(5000))"], {
    timeoutMs: 5000,
    maxOutputBytes: 1024
  });
  assert.equal(result.exitCode, 0);
  assert.equal(Buffer.byteLength(result.stdout), 1024);
  assert.equal(result.stdoutTruncated, true);
});

test('delegate refuses a symlinked .task-delegate run directory', async () => {
  if (process.platform === 'win32') return;
  const root = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-run-link-'));
  const project = path.join(root, 'project');
  const outside = path.join(root, 'outside');
  const bin = path.join(root, 'bin');

  await mkdir(project);
  await mkdir(outside);
  await mkdir(bin);
  await symlink(outside, path.join(project, '.task-delegate'));
  await fakeBinary(bin, 'opencode');

  const cli = path.resolve('bin/task-delegate.mjs');
  const result = await run(process.execPath, [
    cli, 'delegate', '--to', 'opencode', '--task', 'No-op', '--cd', project, '--dry-run', '--json'
  ], {
    cwd: process.cwd(),
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }
  });

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /Refusing symlinked TaskDelegate run path/);
  await rm(root, { recursive: true, force: true });
});

test('allow-dirty reports attribution ambiguity instead of claiming all changes are new', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-dirty-attribution-'));
  const bin = path.join(root, 'bin');
  await mkdir(bin);

  await fakeBinary(bin, 'opencode', `#!/bin/sh
printf 'new\\n' > created.txt
exit 0
`);

  await run('git', ['init'], { cwd: root });
  await run('git', ['config', 'user.email', 'task-delegate@example.invalid'], { cwd: root });
  await run('git', ['config', 'user.name', 'TaskDelegate Test'], { cwd: root });
  await writeFile(path.join(root, 'existing.txt'), 'base\n');
  await run('git', ['add', '.'], { cwd: root });
  await run('git', ['commit', '-m', 'fixture'], { cwd: root });
  await writeFile(path.join(root, 'existing.txt'), 'user change\n');

  const cli = path.resolve('bin/task-delegate.mjs');
  const result = await run(process.execPath, [
    cli, 'delegate', '--to', 'opencode', '--task', 'Create created.txt', '--cd', root,
    '--allow-dirty', '--no-retry', '--json'
  ], {
    cwd: process.cwd(),
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }
  });

  assert.equal(result.exitCode, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed.changeAttribution.preExistingChangedFiles, ['M existing.txt']);
  assert.ok(parsed.changeAttribution.newlyChangedFiles.includes('?? created.txt'));
  assert.equal(parsed.changeAttribution.attributionCertain, false);
  await rm(root, { recursive: true, force: true });
});

test('installer refuses a symlinked skill destination', async () => {
  if (process.platform === 'win32') return;
  const root = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-install-link-'));
  const outside = path.join(root, 'outside');
  const skills = path.join(root, '.claude', 'skills');

  await mkdir(outside);
  await mkdir(skills, { recursive: true });
  await symlink(outside, path.join(skills, 'task-delegate'));

  const previousHome = process.env.TASK_DELEGATE_HOME;
  process.env.TASK_DELEGATE_HOME = root;
  try {
    const moduleUrl = new URL(`../skills/task-delegate/scripts/core/hosts.mjs?hardening=${Date.now()}`, import.meta.url);
    const { installHosts } = await import(moduleUrl.href);
    await assert.rejects(() => installHosts(), /Refusing symlinked skill destination/);
  } finally {
    if (previousHome === undefined) delete process.env.TASK_DELEGATE_HOME;
    else process.env.TASK_DELEGATE_HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('verifier implementation does not invoke a shell find pipeline', async () => {
  const source = await readFile('skills/task-delegate/scripts/manage.mjs', 'utf8');
  assert.doesNotMatch(source, /spawn\('sh'|find .*result\.json|sh', \['-lc'/);
  assert.match(source, /latestResultPath/);
});
