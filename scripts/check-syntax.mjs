import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve('skills/task-delegate/scripts');

async function collectMjsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectMjsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkFile(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], {
      stdio: 'inherit',
      shell: false
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Syntax check failed: ${file}`));
    });
  });
}

const files = await collectMjsFiles(root);

for (const file of files.sort()) {
  await checkFile(file);
}

console.log(`Syntax checked ${files.length} files.`);
