---
name: task-delegate
description: Use TaskDelegate to hand off bounded implementation work to an available CLI coding agent through one portable interface. Discover OpenCode, Codex, Claude Code, Kimi, z.ai, Grok, and Antigravity through one canonical list, run manual delegation by default, receive one normalized result contract, and keep review and commit responsibility with the originating agent or user.
license: Apache-2.0
metadata:
  version: "2.1.0"
  default_mode: manual
  result_contract: task-delegate.result.v2
---

# TaskDelegate

TaskDelegate is one skill and one CLI for portable agent-to-agent delegation.

## Activation rule

When the user invokes `/task-delegate`, `$task-delegate`, `Use task-delegate`, or otherwise explicitly asks to use TaskDelegate:

1. Activate TaskDelegate immediately.
2. Ignore unrelated attachments, images, clipboard content, or earlier tasks unless the user explicitly includes them in the delegation request.
3. Run `task-delegate targets --json` before presenting choices.
4. Do not answer as a generic file, OCR, or attachment assistant.

## Primary interface

```bash
task-delegate targets
task-delegate delegate
task-delegate delegate --to codex --task "Fix the failing tests" --cd .
```

When no target is supplied, show the available target list and ask the user to choose.

## Interactive host flow

When invoked without both a target and a task, start this flow immediately:

1. Run `task-delegate targets --json`.
2. Present exactly these seven targets in this canonical order:
   1. OpenCode
   2. Codex
   3. Claude
   4. Kimi
   5. z.ai
   6. Grok
   7. Antigravity
3. Preserve this order even if the host, registry, or discovery tool returns a different order.
4. Ask the user to choose one target by number or id.
5. Ask for the task if it was not already supplied.
6. Show the current project directory and manual-review mode.
7. Delegate with `task-delegate delegate --to <target> --task <task> --cd <project>`.
8. Return a concise completion summary, changed files, verification status, and review options.

If the host's structured question or selection UI supports fewer than seven choices, do not call it. Use the numbered text list immediately and ask the user to reply with a number or target id.

Do not add “Write-in”, “Other”, or any eighth item to the delegation target list. Free-text target entry may be accepted separately, but it is not a target.

Do not run bare `task-delegate delegate` before target discovery. Do not silently choose a target. Never commit or push automatically.

Antigravity is available as an interactive origin host. It remains visible as target 7 for capability transparency, but until a stable headless Antigravity execution interface is verified, selecting it must explain the limitation and request one of the six headless targets.

## Canonical targets

1. OpenCode (`opencode`)
2. Codex (`codex`)
3. Claude Code (`claude`)
4. Kimi (`kimi`)
5. z.ai through OpenCode (`zai`)
6. Grok (`grok`)
7. Antigravity (`agy`, interactive origin host only)

Auto-select is coming soon and is not part of the seven-target list.

## Operating policy

- Manual review is the default.
- Plan mode is allowed.
- Automatic target selection is not active in v2.1.
- Do not create open recursive agent loops.
- Backend agents must not commit, push, rewrite history, read secrets, or write outside the project.
- Require a clean worktree unless the user explicitly accepts `--allow-dirty`.
- The originating agent reviews the normalized result and Git diff before presenting an outcome.
- Use the legacy `run --brief ...` command only for advanced or backward-compatible workflows.

## Result contract

Each delegation writes `.task-delegate/runs/<task-id>/result.json` using `task-delegate.result.v2`, plus the compact brief, prompt, stdout, stderr, changed-file list, and diff stat.

## Review flow

1. Discover targets.
2. Select an explicit headless target.
3. Generate the bounded brief internally.
4. Dispatch through the registry adapter.
5. Read the normalized result.
6. Review the diff and verification.
7. Present accept, revise, cross-review, or discard options.
8. Never commit automatically.
