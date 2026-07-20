# TaskDelegate

[![skills.sh](https://skills.sh/b/MOHJRNL/task-delegate)](https://skills.sh/MOHJRNL/task-delegate)

**TaskDelegate** is a low-context delegation skill and CLI that lets coding agents hand off bounded implementation tasks to CLI coding agents through compact briefs, safe execution modes, bundled adapters, and structured results.

The first version is intentionally lean:

- **Language:** Node.js
- **Stable backend:** OpenCode
- **Experimental backends:** Codex, Claude Code
- **Default OpenCode mode:** `safe-auto`
- **Safety:** deny rules, no commit boundary, clean working tree preflight
- **Output:** compact `result.json`
- **Adapters:** bundled inside the package; users do not install adapters separately
- **Roadmap:** GitHub, DevSecOps, Python reporting, Kimi/Qwen/Gemini adapters later


## TaskDelegate v0.2 — unified delegation

TaskDelegate now provides one portable delegation interface while preserving the original `run --brief` workflow for backward compatibility.

```bash
npx task-delegate targets
npx task-delegate delegate
npx task-delegate delegate --to codex --task "Fix the failing tests" --cd .
```

Available targets are discovered dynamically:

1. OpenCode
2. Codex
3. Claude Code
4. Antigravity (`agy`)
5. Kimi
6. z.ai
7. Grok
8. Auto-select — coming soon

Manual review is the default. Plan mode is supported. Auto-select and bounded automatic review remain roadmap items; v0.2 does not create recursive agent loops.

Core architecture:

- one skill
- one CLI
- one result contract: `task-delegate.result.v2`
- one adapter registry
- dynamic target discovery
- no server, database, MCP requirement, or workflow engine
- backend agents never commit or push

## Why TaskDelegate exists

Most orchestrator agents waste context when they try to inspect, implement, debug, and review everything inside one conversation. TaskDelegate moves implementation-heavy work into a separate CLI-agent run and returns only a compact result for review.

```text
orchestrator agent
→ compact brief
→ backend adapter
→ CLI coding agent
→ result.json + logs + diff metadata
→ orchestrator review
→ human/orchestrator commit
```

## Current backend matrix

| Backend | Status | Default mode | Recommended use |
|---|---|---|---|
| OpenCode | Stable | `safe-auto` | Mechanical edits, small features, tests, refactors |
| Codex | Experimental | `manual` | Reasoning-heavy implementation or second pass |
| Claude Code | Experimental | `manual` | Complex refactor, architecture-sensitive work, planning/review |

## Requirements

- Node.js 18+
- Git
- At least one supported CLI backend installed and authenticated:
  - `opencode`
  - `codex`
  - `claude`

## Official repository

```text
https://github.com/MOHJRNL/task-delegate
```

## Installation

### Prerequisites

Before installing TaskDelegate, ensure you have:

- **Node.js** 18.17.0 or later
- **Git** installed and available in your PATH
- At least one supported CLI backend installed and authenticated:
  - `opencode` (recommended, stable)
  - `codex` (experimental)
  - `claude` (experimental)

Verify your setup:

```bash
node --version  # Should be >=18.17.0
git --version
opencode --version  # or your chosen backend
```

### Option 1: Run as a CLI with npx (Recommended)

The simplest way to use TaskDelegate is with npx, which requires no installation:

```bash
npx task-delegate@latest --help
npx task-delegate@latest doctor
npx task-delegate@latest targets
```

For a specific version:

```bash
npx task-delegate@0.2.0 --help
```

### Option 2: Install as an Agent Skill

If you use an agent framework that supports the `skills` CLI:

```bash
npx skills add MOHJRNL/task-delegate@latest --skill task-delegate
```

This copies the skill package including all adapters and scripts. No separate adapter installation is required.

### Option 3: Global Installation

For frequent use, install globally:

```bash
npm install -g task-delegate@latest
```

Then run directly:

```bash
task-delegate --help
task-delegate doctor
task-delegate targets
```

### Option 4: Install Skill from npm Package

To copy the skill directly from the npm package into your agent project:

```bash
npx task-delegate@latest install-skill --dest .claude/skills
```

This installs:

```text
.claude/skills/task-delegate/
├── SKILL.md
├── scripts/
└── references/
```

### Development Installation

For local development:

```bash
# Clone the repository
git clone https://github.com/MOHJRNL/task-delegate.git
cd task-delegate

# Run tests
npm test
npm run check

# Run the CLI locally
node bin/task-delegate.mjs --help
node bin/task-delegate.mjs doctor
```

### Troubleshooting Installation

**Node.js version too old:**

```bash
# Install Node.js 18+ using nvm (recommended)
nvm install 18
nvm use 18
```

**Git not found:**

Install Git from https://git-scm.com/downloads or via your system package manager.

**Backend CLI not working:**

Ensure your chosen backend CLI is installed and authenticated:

```bash
# For OpenCode
opencode --version

# For Codex
codex --version

# For Claude Code
claude --version
```

## What is bundled vs external

Bundled:

- `task-delegate` CLI
- `task-delegate` skill
- OpenCode/Codex/Claude adapters
- brief templates
- permission/review references

External prerequisites:

- Node.js
- Git
- whichever backend CLI the user wants to run: `opencode`, `codex`, or `claude`
- backend authentication/configuration

Adapters are wrappers. They are intentionally bundled. Backend CLIs are not bundled because they have their own installation, authentication, permissions, model access, and release cadence.

## Quick start for local development

```bash
npm test
npm run check
npm run pack:dry-run
```

Run the CLI locally from the repo:

```bash
node bin/task-delegate.mjs --help
node bin/task-delegate.mjs doctor
node bin/task-delegate.mjs list-backends
```

Dry run without launching a backend:

```bash
npm run dry-run
```

Delegate to OpenCode:

```bash
task-delegate run \
  --backend opencode \
  --mode safe-auto \
  --brief examples/brief.sample.md \
  --cd /path/to/project
```

Delegate to Codex manually:

```bash
task-delegate run \
  --backend codex \
  --mode manual \
  --brief examples/brief.sample.md \
  --cd /path/to/project
```

Delegate to Claude Code in plan mode:

```bash
task-delegate run \
  --backend claude \
  --mode plan \
  --brief examples/brief.sample.md \
  --cd /path/to/project
```

## Skill installation helper

If a user wants to copy the skill directly from the npm package into a local agent project:

```bash
npx task-delegate install-skill --dest .claude/skills
```

This installs:

```text
.claude/skills/task-delegate/
├── SKILL.md
├── scripts/
└── references/
```

The adapter scripts are included. No separate adapter package is needed.

## Publishing to npm

TaskDelegate is npm-ready. The package exposes a CLI binary through the `bin` field:

```json
{
  "bin": {
    "task-delegate": "bin/task-delegate.mjs"
  }
}
```

Before the first public release:

```bash
npm login
npm run prepublishOnly
npm publish
```

If the unscoped package name `task-delegate` is unavailable, switch to a scoped package name, for example:

```json
{
  "name": "@mohjrnl/task-delegate",
  "bin": {
    "task-delegate": "bin/task-delegate.mjs"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Then users can run:

```bash
npx @mohjrnl/task-delegate --help
```

## Output

Each run writes to:

```text
.task-delegate/runs/<timestamp>-<backend>/
├── result.json
├── stdout.log
├── stderr.log
├── prompt.md
├── git-before.txt
├── git-after.txt
├── diff-stat.txt
└── changed-files.txt
```

`result.json` is intentionally compact so the orchestrator does not need to load long logs into context.

## Modes

| Mode | Meaning |
|---|---|
| `plan` | Ask the backend to analyze and propose a plan only. |
| `manual` | Run with conservative/manual permissions where supported. |
| `safe-auto` | Allow non-interactive execution with guardrails. Stable only for OpenCode in v0.1. |

## Safety model

TaskDelegate does not claim to make CLI agents safe by itself. It creates a safer operating loop:

- no commits by backend agents
- dirty working tree preflight
- deny rules for OpenCode via `OPENCODE_PERMISSION`
- compact output instead of full transcript loading
- explicit review required
- destructive command warnings

## Troubleshooting

### TaskDelegate requires a Git project

TaskDelegate is designed to run inside a Git repository so it can capture:

- Git status before and after the delegated run
- changed files
- diff stat
- review metadata

For a new test project:

```bash
git init
echo ".task-delegate/" >> .gitignore
git add .
git commit -m "Initial project"
```

The `.task-delegate/` directory contains run outputs and should normally be ignored.

### OpenCode fails with `Unexpected server error`

First test OpenCode directly:

```bash
opencode run --pure --print-logs --log-level DEBUG "Say hello and do not edit files."
```

If the logs show `ProviderModelNotFoundError`, your default OpenCode model is invalid or no longer available.

List available models:

```bash
opencode models
```

Then pass a valid model explicitly:

```bash
npx github:MOHJRNL/task-delegate run \
  --backend opencode \
  --mode safe-auto \
  --brief brief.md \
  --cd . \
  --model zai-coding-plan/glm-4.7
```

The `--model` flag is optional, but useful when the default OpenCode model is not configured correctly.

### Payment method errors

Some OpenCode-hosted models may require billing. If you see a `No payment method` error, choose another available model or configure billing in OpenCode.

### Duplicate skill warning

If TaskDelegate is installed both globally and for Claude Code, OpenCode may warn about duplicate skill names, for example:

```text
duplicate skill name task-delegate
```

This is usually harmless. It means the same skill exists in more than one skill location, such as:

```text
~/.agents/skills/task-delegate
~/.claude/skills/task-delegate
```

## Attribution and forks

TaskDelegate uses Apache-2.0 with a `NOTICE` file. Forks and redistributed derivative packages should preserve the license and NOTICE attribution. GitHub forks will also show the upstream relationship automatically when created through GitHub.

## Roadmap

See [`skills/task-delegate/references/roadmap.md`](skills/task-delegate/references/roadmap.md).
