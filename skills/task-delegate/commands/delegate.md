---
description: Delegate a bounded task to another coding CLI
---

Start immediately by running:

```bash
task-delegate targets --json
```

Present this exact target order:

1. OpenCode
2. Codex
3. Claude
4. Kimi
5. z.ai
6. Grok
7. Antigravity

Ask the user to choose a target, then ask for the task if it was not already provided. Confirm the current project directory and manual-review mode, then execute:

```bash
task-delegate delegate --to <target> --task "<task>" --cd "<project>"
```

After completion, summarize the result, changed files, verification, and the options to review, revise, cross-review, or discard. Never commit or push automatically.

Antigravity is currently an interactive origin host, not a verified headless delegation target. If selected as the target, explain this and request another headless target.
