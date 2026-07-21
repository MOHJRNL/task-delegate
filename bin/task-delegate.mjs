#!/usr/bin/env node
const managementCommands = new Set(['setup','verify','doctor','hosts','update','uninstall']);
if (managementCommands.has(process.argv[2])) {
  await import('../skills/task-delegate/scripts/manage.mjs');
} else {
const command = process.argv[2];
if (['delegate', 'targets'].includes(command)) {
  const { main } = await import('../skills/task-delegate/scripts/unified.mjs');
  await main();
} else {
  await import('../skills/task-delegate/scripts/relay.mjs');
}

}
