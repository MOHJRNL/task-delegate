---
name: task-delegate
description: Use TaskDelegate to hand off bounded implementation work to an available CLI coding agent through one portable interface. Discover OpenCode, Codex, Claude Code, Antigravity, Kimi, z.ai, and Grok targets, run manual delegation by default, receive one normalized result contract, and keep review and commit responsibility with the originating agent or user. Auto-select and bounded automatic review are roadmap features, not active recursive loops.
license: Apache-2.0
metadata:
  version: "0.2.1"
  default_mode: manual
  result_contract: task-delegate.result.v2
---

# TaskDelegate

TaskDelegate is one skill and one CLI for portable agent-to-agent delegation.

## Primary interface

```bash
task-delegate targets
task-delegate delegate
task-delegate delegate --to codex --task "Fix the failing tests" --cd .
```

When no target is supplied, show the available target list and ask the user to choose.

## Targets

- OpenCode
- Codex
- Claude Code
- Antigravity (`agy`)
- Kimi
- z.ai through the OpenCode adapter and `zai-coding-plan/glm-4.7` default model
- Grok
- Auto-select: coming soon

## Operating policy

- Manual review is the default.
- Plan mode is allowed.
- Automatic delegation is not active in v0.2.
- Do not create open recursive agent loops.
- Backend agents must not commit, push, rewrite history, read secrets, or write outside the project.
- Require a clean worktree unless the user explicitly accepts `--allow-dirty`.
- The originating agent reviews the normalized result and Git diff before presenting an outcome.
- Use the legacy `run --brief ...` command only for advanced or backward-compatible workflows.

## Result contract

Each delegation writes `.task-delegate/runs/<task-id>/result.json` using `task-delegate.result.v2`, plus the compact brief, prompt, stdout, stderr, changed-file list, and diff stat.

## Review flow

1. Discover targets.
2. Select an explicit target.
3. Generate the bounded brief internally.
4. Dispatch through the registry adapter.
5. Read the normalized result.
6. Review the diff and verification.
7. Present accept, revise, cross-review, or discard options.
8. Never commit automatically.
