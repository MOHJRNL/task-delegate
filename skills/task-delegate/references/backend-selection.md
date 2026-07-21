# Target selection

TaskDelegate v2.1 uses explicit target selection. Automatic routing is intentionally excluded because deterministic selection is simpler, safer, easier to debug, and less likely to waste tokens.

## Public targets

1. OpenCode
2. Codex
3. Claude Code
4. Kimi
5. z.ai
6. Grok
7. Antigravity

All seven targets are supported and included in the live verifier when their CLIs are installed and authenticated.

## Practical selection guidance

Use OpenCode for clear bounded implementation, tests, and repetitive edits.

Use Codex for reasoning-heavy implementation, debugging, or a second implementation pass.

Use Claude Code for architecture-sensitive changes, complex refactors, or plan-first work.

Use Kimi for bounded implementation where its local CLI is already configured.

Use z.ai when you want the configured z.ai coding model through the OpenCode runtime.

Use Grok for bounded implementation through its single-prompt CLI mode.

Use Antigravity for headless workspace edits when its CLI is installed and authenticated. Its permission model requires strict diff review.

## No automatic routing

TaskDelegate does not silently choose a target. The user or originating agent selects one explicitly after target discovery.
