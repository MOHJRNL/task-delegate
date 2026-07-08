#!/usr/bin/env node
// TaskDelegate CLI entrypoint.
// Keeps the published npm bin stable even if the internal skill script moves later.
import '../skills/task-delegate/scripts/relay.mjs';
