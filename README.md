# TaskDelegate

[![npm](https://img.shields.io/npm/v/task-delegate)](https://www.npmjs.com/package/task-delegate)
[![license](https://img.shields.io/npm/l/task-delegate)](LICENSE)
[![skills.sh](https://skills.sh/b/MOHJRNL/task-delegate)](https://skills.sh/MOHJRNL/task-delegate)

**TaskDelegate** is a portable CLI and agent skill for handing bounded coding tasks to local CLI coding agents while keeping review, approval, commits, and publishing with the originating user or agent.

```bash
npx task-delegate@latest targets
npx task-delegate@latest delegate
```

## What v0.2 provides

- One CLI and one skill
- Interactive or non-interactive delegation
- Dynamic target availability checks
- Manual review by default
- Plan-only delegation mode
- Clean-worktree protection
- Normalized `task-delegate.result.v2` results
- Per-run briefs, prompts, logs, changed-file lists, and diff statistics
- Backward compatibility with the original `run --brief` interface

TaskDelegate does **not** run an autonomous recursive agent loop. It does not commit, push, publish, or accept delegated changes automatically.

## How it works

```text
user or orchestrator
  → bounded task
  → target registry
  → local CLI coding agent
  → code changes + run artifacts
  → result.json
  → explicit human/orchestrator review
```

The delegated agent receives hard rules that prohibit commits, pushes, history rewrites, credential access, writes outside the project, and unrelated changes.

## Requirements

- Node.js `18.17.0` or later
- Git
- At least one supported target CLI installed and authenticated

Check the local environment:

```bash
npx task-delegate@latest doctor
npx task-delegate@latest targets
```

`doctor` currently reports the three legacy adapter CLIs: OpenCode, Codex, and Claude Code. `targets` reports every v0.2 delegation target and whether its executable is available in `PATH`.

## Installation

### Run with npx

No global installation is required:

```bash
npx task-delegate@latest --help
npx task-delegate@latest targets
npx task-delegate@latest delegate
```

Pin a release for reproducible use:

```bash
npx task-delegate@0.2.0 targets
```

### Install globally

```bash
npm install -g task-delegate@latest

task-delegate targets
task-delegate delegate
```

### Install as an agent skill

Using the `skills` CLI:

```bash
npx skills add MOHJRNL/task-delegate --skill task-delegate
```

Or copy the bundled skill from the npm package:

```bash
npx task-delegate@latest install-skill --dest .claude/skills
```

This creates:

```text
.claude/skills/task-delegate/
├── SKILL.md
├── commands/
├── references/
└── scripts/
```

Backend CLIs are external prerequisites and are not installed by TaskDelegate.

## Quick start

Run inside a clean Git repository:

```bash
cd /path/to/project
npx task-delegate@latest delegate
```

TaskDelegate will:

1. Display available targets.
2. Ask you to choose one.
3. Ask for the task.
4. Refuse a dirty worktree unless explicitly allowed.
5. Run the selected CLI agent.
6. Write a normalized result and supporting artifacts.
7. Leave all changes uncommitted for review.

Non-interactive example:

```bash
npx task-delegate@latest delegate \
  --to opencode \
  --task "Fix the failing tests and keep the change narrowly scoped" \
  --cd .
```

Plan-only example:

```bash
npx task-delegate@latest delegate \
  --to claude \
  --mode plan \
  --task "Review the authentication flow and propose a safe refactor" \
  --cd .
```

## Delegation targets

| Target | ID | Executable | Status | Notes |
|---|---|---|---|---|
| OpenCode | `opencode` | `opencode` | Stable | General implementation target |
| Codex | `codex` | `codex` | Stable | Uses `codex exec` |
| Claude Code | `claude` | `claude` | Stable | Uses print mode with explicit permission mode |
| Antigravity | `agy` | `agy` | Experimental | Requires the `agy` CLI |
| Kimi | `kimi` | `kimi` | Experimental | Requires the `kimi` CLI |
| z.ai | `zai` | `opencode` | Stable | Reuses OpenCode with `zai-coding-plan/glm-4.7` by default |
| Grok | `grok` | `grok` | Experimental | Requires the `grok` CLI |
| Auto-select | `auto` | — | Coming soon | Not available in v0.2 |

Availability means that the required executable was found in `PATH`. TaskDelegate does not currently verify backend authentication before dispatch.

## Unified command reference

### List targets

```bash
task-delegate targets
task-delegate targets --json
```

### Delegate

```bash
task-delegate delegate [options]
```

Options:

```text
--to <opencode|codex|claude|agy|kimi|zai|grok>
--task <text>
--cd <path>
--mode <manual|plan>
--model <name>
--timeout-ms <number>
--allow-dirty
--dry-run
--json
```

`manual` is the default. `plan` prepends a no-edit planning instruction. Automatic target selection is not implemented.

### Dry run

A dry run creates the prompt and result artifacts without launching the target CLI:

```bash
task-delegate delegate \
  --to opencode \
  --task "Describe the intended change" \
  --cd . \
  --dry-run
```

## Run artifacts

Each unified delegation writes to:

```text
.task-delegate/runs/<timestamp>-<target>/
├── result.json
├── brief.md
├── prompt.md
├── stdout.log
├── stderr.log
├── changed-files.txt
└── diff-stat.txt
```

Add the run directory to the delegated project’s `.gitignore`:

```bash
echo ".task-delegate/" >> .gitignore
```

The normalized result uses:

```json
{
  "schemaVersion": "task-delegate.result.v2",
  "status": "completed",
  "target": "opencode",
  "mode": "manual",
  "changedFiles": ["README.md"],
  "reviewRequired": true,
  "commitAllowed": false,
  "nextActions": ["accept", "revise", "cross-review", "discard"]
}
```

`nextActions` are review recommendations in v0.2; they are not yet executable TaskDelegate subcommands.

## Safety boundaries

TaskDelegate provides guardrails, not a security sandbox.

- A clean worktree is required by default.
- `--allow-dirty` must be explicit.
- Delegated prompts prohibit commits and pushes.
- Delegated prompts prohibit reading secrets and credentials.
- Delegated prompts prohibit writes outside the selected project.
- Runs use a bounded timeout; the default is 30 minutes.
- All generated changes require review.
- TaskDelegate never commits or publishes automatically.

Before accepting a delegated result:

```bash
git status
git diff
npm test
```

Use checks appropriate to the delegated project.

## Legacy brief workflow

The original v0.1-compatible interface remains available for advanced workflows:

```bash
task-delegate init-brief --out task-delegate.brief.md

task-delegate run \
  --backend opencode \
  --mode safe-auto \
  --brief task-delegate.brief.md \
  --cd .
```

Legacy commands:

```text
doctor
list-backends
skill-path
install-skill
init-brief
run
```

The legacy workflow supports OpenCode, Codex, and Claude adapters and writes the older `schemaVersion: "0.1"` result shape. New integrations should prefer `delegate` and `task-delegate.result.v2`.

## Troubleshooting

### Dirty worktree refused

TaskDelegate protects existing uncommitted work:

```text
Dirty worktree refused. Commit/stash changes or use --allow-dirty.
```

Preferred resolution:

```bash
git status
git add .
git commit -m "Checkpoint before delegation"
```

Use `--allow-dirty` only when you intentionally accept mixed pre-existing and delegated changes.

### Target is not available

Check the target executable:

```bash
opencode --version
codex --version
claude --version
agy --version
kimi --version
grok --version
```

Then authenticate using that target’s own CLI instructions.

### OpenCode model error

List available models:

```bash
opencode models
```

Pass a valid model explicitly:

```bash
task-delegate delegate \
  --to opencode \
  --model <provider/model> \
  --task "Fix the requested issue" \
  --cd .
```

### Duplicate skill warning

A duplicate skill warning usually means TaskDelegate is installed in more than one agent skill directory. Remove the unwanted duplicate or keep a single canonical installation.

## Development

```bash
git clone https://github.com/MOHJRNL/task-delegate.git
cd task-delegate

npm run check
npm test
npm run pack:dry-run
node bin/task-delegate.mjs targets
```

The project intentionally has no runtime dependencies.

## Versioning and releases

- npm package: `task-delegate`
- GitHub repository: `MOHJRNL/task-delegate`
- Current stable release line: `0.2.x`

Release validation is enforced by `prepublishOnly`:

```bash
npm run check
npm test
npm run pack:dry-run
```

## Current limitations

- No automatic target selection
- No executable accept, revise, cross-review, or discard commands
- No authentication verification in target discovery
- No live interactive relay after dispatch
- No streaming normalized event protocol
- `doctor` and the legacy adapter registry cover only OpenCode, Codex, and Claude
- The unified and legacy workflows currently use different result schemas

## Roadmap

Planned improvements include:

- Explicit review commands
- Authentication-aware target diagnostics
- Unified doctor and target registries
- Optional live streaming and interactive delegation
- Bounded automatic target selection
- One result schema across unified and legacy workflows

See [`skills/task-delegate/references/roadmap.md`](skills/task-delegate/references/roadmap.md).

## License

Apache-2.0. Preserve [`NOTICE`](NOTICE) when redistributing modified versions.
