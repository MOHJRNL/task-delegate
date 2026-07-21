---
description: Delegate a bounded task to another coding CLI
---

When this command or TaskDelegate is explicitly invoked, activate TaskDelegate immediately. Ignore unrelated attachments or prior content unless the user explicitly includes them in the requested task.

Start by running:

```bash
task-delegate targets --json
```

Present exactly this canonical target order:

1. OpenCode
2. Codex
3. Claude
4. Kimi
5. z.ai
6. Grok
7. Antigravity

Preserve this order regardless of host or registry output.

If the host selection UI supports fewer than seven options, do not call it. Show the numbered text list and ask the user to reply with a number or target id. Do not add an eighth “Write-in” or “Other” target.

Ask the user to choose a target, then ask for the task if it was not already provided. Confirm the current project directory and manual-review mode, then execute:

```bash
task-delegate delegate --to <target> --task "<task>" --cd "<project>"
```

After completion, summarize the result, changed files, verification, and the options to review, revise, cross-review, or discard. Never commit or push automatically.

Antigravity is an interactive origin host, not a verified headless delegation target. If target 7 is selected, explain this limitation and request OpenCode, Codex, Claude, Kimi, z.ai, or Grok.
