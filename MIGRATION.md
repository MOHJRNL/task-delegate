# Migrating from TaskDelegate 0.2.1 to 2.1.0

TaskDelegate 2.1.0 introduces a unified target-oriented workflow while retaining the older brief-based command for compatibility.

## Upgrade

After 2.1.0 is published:

```bash
npm install -g task-delegate@2.1.0
task-delegate setup
task-delegate setup --check
```

Or run without a global installation:

```bash
npx -y task-delegate@2.1.0 setup
```

Restart any already-open host CLI after setup.

## Command changes

### Recommended v2.1 workflow

Old:

```bash
task-delegate run \
  --backend opencode \
  --mode plan \
  --brief brief.md \
  --cd .
```

New:

```bash
task-delegate delegate \
  --to opencode \
  --mode plan \
  --task "Describe the bounded task" \
  --cd .
```

The old `run` command is still available for backward compatibility.

## Backend terminology

The unified interface uses **target**:

```bash
task-delegate targets
task-delegate delegate --to codex ...
```

Legacy commands may still use **backend**:

```bash
task-delegate list-backends
task-delegate run --backend opencode ...
```

## Supported targets

Version 2.1.0 exposes seven targets:

```text
opencode
codex
claude
kimi
zai
grok
agy
```

`auto` is not a selectable target.

## Setup behavior

Version 2.1.0 installs the skill bundled inside the package instead of fetching an external or potentially stale copy.

Run:

```bash
task-delegate setup
task-delegate setup --check
```

The setup output reports:

- host binary detection
- installation path
- installed skill version
- expected package version
- version match status

## Default safety behavior

Version 2.1.0 requires a clean worktree by default.

To delegate inside a dirty repository:

```bash
task-delegate delegate \
  --to opencode \
  --task "Complete the bounded task" \
  --cd . \
  --allow-dirty
```

The result identifies pre-existing and newly changed files, but edits to already-dirty files can remain attribution-ambiguous.

## Result changes

The unified workflow writes:

```text
.task-delegate/runs/<run-id>/result.json
```

with contract:

```text
task-delegate.result.v2
```

Do not rely on fields from the older result shape without updating your integration.

Version 2.1.0 also reports:

- selected target
- process timing
- timeout status
- commit creation
- changed files
- dirty-worktree attribution
- output truncation
- review requirement

## Retry and timeout behavior

The unified workflow defaults to:

```text
timeout: 180000 ms
retries: 1
```

Retries apply only to transient launch or timeout failures.

Override them with:

```bash
task-delegate delegate \
  --to codex \
  --task "Complete the task" \
  --timeout-ms 300000 \
  --retries 0 \
  --cd .
```

or:

```bash
--no-retry
```

## Antigravity

Antigravity is now a supported headless target:

```bash
task-delegate delegate \
  --to agy \
  --task "Create the requested bounded change" \
  --cd .
```

Its print mode cannot prompt for write permission, so TaskDelegate uses sandboxed non-interactive approval with explicit workspace binding. Review every diff.

## Package API changes

TaskDelegate is distributed as a CLI and skill, not as a general JavaScript library.

The package no longer exposes:

```text
task-delegate
task-delegate/relay
```

as JavaScript entry points.

The supported package exports are:

```text
task-delegate/skill
task-delegate/package.json
```

Use the CLI for execution.

## Verification after migration

```bash
task-delegate targets
task-delegate doctor
task-delegate setup --check

task-delegate verify \
  --live \
  --jobs 2 \
  --timeout-ms 180000
```

Then run your normal project tests and inspect the generated diff before committing.
