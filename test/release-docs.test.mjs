import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('release documentation describes v2.1 unified seven-target workflow', async () => {
  const [readme, changelog, migration] = await Promise.all([
    read('README.md'),
    read('CHANGELOG.md'),
    read('MIGRATION.md')
  ]);

  assert.match(readme, /TaskDelegate v2\.1\.0 has been live-verified against all seven targets/);
  assert.match(readme, /task-delegate delegate/);
  assert.match(readme, /task-delegate\.result\.v2/);
  assert.match(readme, /Reject backend-created Git commits|detection and rejection of commits created by a backend/i);
  assert.doesNotMatch(readme, /Antigravity.*origin host only/i);

  assert.match(changelog, /## \[2\.1\.0\] - 2026-07-21/);
  assert.match(changelog, /42 automated tests passed/);
  assert.match(changelog, /All seven targets passed live bounded smoke verification/);

  assert.match(migration, /Migrating from TaskDelegate 0\.2\.1 to 2\.1\.0/);
  assert.match(migration, /The old `run` command is still available for backward compatibility/);
  assert.match(migration, /task-delegate\/skill/);
});

test('npm package allowlist includes release documentation', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.ok(pkg.files.includes('README.md'));
  assert.ok(pkg.files.includes('CHANGELOG.md'));
  assert.ok(pkg.files.includes('MIGRATION.md'));
});
