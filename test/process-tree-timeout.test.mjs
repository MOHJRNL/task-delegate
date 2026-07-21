import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { runProcess } from '../skills/task-delegate/scripts/lib/utils.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test('timeout terminates the delegated process tree', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX process-group behavior is covered on macOS/Linux; Windows uses taskkill /T.');
    return;
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), 'task-delegate-tree-'));
  const marker = path.join(dir, 'orphan-marker.txt');
  const grandchild = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'orphan'), 700); setTimeout(() => {}, 5000);`;
  const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore' }); setTimeout(() => {}, 5000);`;

  const result = await runProcess(process.execPath, ['-e', parent], {
    cwd: dir,
    timeoutMs: 150
  });

  assert.equal(result.timedOut, true);
  await delay(1100);
  assert.equal(await exists(marker), false, 'grandchild survived after timeout');
});
