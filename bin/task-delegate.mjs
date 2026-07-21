#!/usr/bin/env node

function printHelp() {
  console.log(`TaskDelegate CLI

Usage:
  task-delegate delegate [options]
  task-delegate targets [--json]
  task-delegate setup [--check|--dry-run]
  task-delegate verify [--live] [--target <id>] [--jobs <n>] [--timeout-ms <n>] [--json]
  task-delegate doctor
  task-delegate hosts
  task-delegate uninstall
  task-delegate update
  task-delegate run --brief brief.md [legacy options]

Common options:
  -h, --help                 Show help

Examples:
  task-delegate targets --json
  task-delegate delegate --to codex --task "Fix failing tests" --cd .
  task-delegate setup
  task-delegate setup --check
  task-delegate verify --live --jobs 2 --timeout-ms 180000
`);
}

const command = process.argv[2];

try {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
  } else if (['setup', 'verify', 'doctor', 'hosts', 'update', 'uninstall'].includes(command)) {
    await import('../skills/task-delegate/scripts/manage.mjs');
  } else if (['delegate', 'targets'].includes(command)) {
    const { main } = await import('../skills/task-delegate/scripts/unified.mjs');
    await main();
  } else {
    await import('../skills/task-delegate/scripts/relay.mjs');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`TaskDelegate error: ${message}`);
  process.exitCode = 1;
}
