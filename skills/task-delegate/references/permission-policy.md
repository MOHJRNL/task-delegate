# Permission policy

TaskDelegate delegates implementation work while keeping repository ownership and final approval with the user or originating agent.

## Unified v2.1 modes

| Mode | Behavior |
|---|---|
| `plan` | Analyze and return a plan. File edits are prohibited. |
| `manual` | Execute a bounded task using the target's supported non-interactive editing mode. Review remains mandatory. |

The unified `task-delegate delegate` flow does not expose automatic target selection or unrestricted autonomous execution.

## Universal task boundaries

Every delegated prompt prohibits:

- commits and pushes;
- hard resets, cleans, and history rewrites;
- reading `.env`, private keys, tokens, or unrelated secrets;
- writing outside the selected project;
- package installation unless the task explicitly permits it;
- destructive or externally visible actions not explicitly requested.

These prompt boundaries are defense-in-depth, not a substitute for host sandboxing and post-run verification.

## Deterministic controls

TaskDelegate also applies:

- an explicit project directory;
- clean-worktree validation unless `--allow-dirty` is used;
- bounded execution timeout;
- one retry only for transient launch or timeout failures;
- no automatic commit or push;
- normalized result validation;
- Git changed-file and diff inspection;
- verification that delegated runs do not create commits.

## Target-specific behavior

### OpenCode

The current unified adapter uses OpenCode build or plan agents and disables automatic update and pruning for predictable delegated runs. The legacy `run` compatibility command may expose `safe-auto` with an explicit deny/ask profile.

### Codex

Codex runs in workspace-write mode for implementation and keeps commit and push prohibited by the delegated prompt and post-run Git verification.

### Claude Code

Claude implementation runs use `acceptEdits`; plan mode uses Claude's plan permission mode. Manual review remains required.

### Kimi

Kimi uses non-interactive prompt execution. TaskDelegate verifies the resulting files and Git state rather than trusting textual completion alone.

### z.ai

z.ai uses the OpenCode adapter with the configured z.ai model. The same workspace and review controls apply.

### Grok

Grok uses single-prompt execution with the delegated process working directory set to the selected project. TaskDelegate does not currently pass a Grok-specific workspace or permission-approval flag.

Repository safety therefore relies on the selected process working directory, bounded timeout, delegated prompt boundaries, commit detection, changed-file inspection, Git diff review, and normalized result validation. Manual review remains mandatory.

### Antigravity

Antigravity print mode auto-denies write tools when it cannot prompt. Reliable headless editing therefore requires sandbox mode with non-interactive permission approval.

TaskDelegate constrains this behavior with:

- `--add-dir <project>` workspace binding;
- `--sandbox`;
- a bounded print timeout;
- no automatic commit or push;
- normalized result validation;
- changed-file, content, and Git HEAD verification.

Because Antigravity's permission bypass is broad inside its execution context, users must review every diff and should run TaskDelegate only in repositories they trust.

## Legacy compatibility mode

The legacy `task-delegate run --brief ...` path retains `safe-auto` and `--force` options for backward compatibility. They are advanced options, not defaults for the unified v2.1 workflow.
