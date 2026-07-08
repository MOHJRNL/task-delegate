# Backend selection

TaskDelegate v0.1 uses manual backend selection. Do not add a smart router yet.

## Backend matrix

| Backend | Status | Best for | Default mode |
|---|---|---|---|
| OpenCode | Stable | Mechanical edits, tests, simple features, repetitive implementation | `safe-auto` |
| Codex | Experimental | Reasoning-heavy implementation, bug fixing, second pass | `manual` |
| Claude | Experimental | Planning, architecture-sensitive changes, complex refactors | `manual` or `plan` |

## Selection rules

Use OpenCode when:

- The task is clear and bounded.
- The change is mostly implementation.
- Cost/context efficiency matters most.
- You want non-interactive execution with deny rules.

Use Codex when:

- The task needs deeper reasoning than a mechanical edit.
- You want a second implementation or review pass.
- OpenCode failed or produced a weak result.

Use Claude when:

- The task involves architecture tradeoffs.
- The codebase is complex.
- You want a high-quality plan before editing.
- The change is sensitive enough to prefer manual permissions.

## Do not route automatically in v0.1

Automatic routing adds complexity and may waste tokens when it picks the wrong backend. The v0.1 design uses an adapter layer, not a smart router.

Roadmap:

- v0.3: `--backend auto` rule-based router
- v0.5: `--profile cheap|balanced|best` cost-aware router
