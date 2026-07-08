---
name: task-delegate
description: Use this skill when the user wants to delegate a bounded coding task from Claude, Cursor, Codex, Gemini, or another orchestrator agent to CLI coding agents with low context usage. TaskDelegate creates a compact brief, runs a selected backend adapter, captures compact structured results, and keeps review/commit responsibility with the orchestrator. Use OpenCode as the stable default backend. Codex and Claude are experimental/manual backends in v0.1. Do not use for tiny inline edits, vague discovery, direct production changes without review, or tasks requiring GitHub PR automation.
license: Apache-2.0
metadata:
  version: "0.1.0"
  backends:
    opencode: stable
    codex: experimental
    claude: experimental
---

# TaskDelegate

You are the orchestrator. The backend CLI agent is the implementer.

Your job is to compress the user's task into a small, complete brief, send it to the selected backend, collect the compact result, then review the diff and gates before accepting anything.

## Use this skill when

- The task is implementation-heavy.
- The task is bounded enough to describe clearly.
- The user wants efficient delegation with low context usage.
- A backend CLI agent can work from the repository plus a compact brief.
- The final decision should remain with the orchestrator or human reviewer.

## Do not use this skill when

- The edit is tiny and faster to do directly.
- The task is vague, strategic, or product-discovery-only.
- The task requires secrets, credentials, or private tokens.
- The task requires GitHub PR automation.
- The user expects the backend agent to commit or push.

## Backend policy v0.1

- `opencode` is stable and should be the default.
- `codex` is experimental and should use `manual` unless the user explicitly accepts a different mode.
- `claude` is experimental and should use `manual` or `plan` unless the user explicitly accepts a different mode.

## Core rules

- Backend agents must not commit.
- Backend agents must not push.
- Backend agents must not reset, clean, or rewrite git history.
- Backend agents must not read `.env`, key, certificate, or secret files.
- Backend agents must not modify files outside the project directory.
- Backend agents must not install new packages unless explicitly allowed in the brief.
- The orchestrator must review the final diff before accepting the result.
- The orchestrator must re-run gates or clearly report that gates were not run.

## Low-context rules

- Preferred brief size: 40-80 lines.
- Default maximum brief size: 120 lines.
- Do not paste full chat history into the brief.
- Do not paste large files unless necessary.
- On retry, send a delta brief only.
- Load backend-specific references only when needed.

## Default process

1. Decide whether delegation is appropriate.
2. Select backend:
   - simple/mechanical: `opencode`
   - reasoning-heavy: `codex`
   - architecture-sensitive: `claude`
3. Write a compact brief using `references/brief-template.md`.
4. Run the relay:

```bash
node skills/task-delegate/scripts/relay.mjs --backend opencode --mode safe-auto --brief /path/to/brief.md --cd /path/to/project
```

5. Read `result.json`.
6. Inspect changed files and diff stat.
7. Re-run tests/lint/build where practical.
8. Summarize:
   - what changed
   - files changed
   - gates run
   - risks
   - next action

## References

- `references/brief-template.md`
- `references/backend-selection.md`
- `references/permission-policy.md`
- `references/result-schema.md`
- `references/review-checklist.md`
- `references/roadmap.md`


## Public usage

TaskDelegate can be used either as an installed Agent Skill or through the bundled npm CLI:

```bash
npx task-delegate run --backend opencode --mode safe-auto --brief brief.md --cd .
```

The OpenCode, Codex, and Claude adapter scripts are bundled with the skill. Backend CLIs themselves must be installed and authenticated separately.
