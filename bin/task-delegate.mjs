#!/usr/bin/env node
const command = process.argv[2];
if (['delegate', 'targets'].includes(command)) {
  const { main } = await import('../skills/task-delegate/scripts/unified.mjs');
  await main();
} else {
  await import('../skills/task-delegate/scripts/relay.mjs');
}
