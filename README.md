# TaskDelegate v2.1.0

TaskDelegate provides one portable installation entry point, host integrations, seven delegation targets, normalized results, and mandatory review boundaries.

## Install once

```bash
npx task-delegate@2.1.0 setup
```

The setup command uses Skills CLI as the portable installation layer and registers TaskDelegate with every detected supported host. It does not install, authenticate, or configure third-party CLIs.

Check installation:

```bash
task-delegate setup --check
task-delegate hosts
task-delegate doctor
```

## Host invocation

| Host | Invocation |
|---|---|
| Claude Code | `/task-delegate` |
| Codex CLI | `$task-delegate` |
| OpenCode | `/task-delegate` |
| Antigravity | Installed TaskDelegate skill; use the host's skill invocation UI |
| Kimi Code CLI | Installed TaskDelegate skill; use the host's skill invocation UI |
| Grok CLI | Installed TaskDelegate skill; use the host's skill invocation UI |
| Terminal | `task-delegate delegate` |

The installer prints the exact invocation detected for the installed host version. TaskDelegate does not claim identical slash-command syntax where the host does not provide it.

## Delegation targets

```text
opencode, codex, claude, agy, kimi, zai, grok
```

z.ai is routed through OpenCode with the configured z.ai model; it is a target route rather than a standalone origin host.

## Verification

Local detection and configuration checks:

```bash
task-delegate verify
```

Paid, authenticated end-to-end smoke tests in disposable Git repositories:

```bash
task-delegate verify --live
```

One target:

```bash
task-delegate verify --target codex --live
```

Live verification checks exact file output, unchanged Git HEAD, no automatic commit, and `result.json` schema validity. A target is not release-qualified until its live verification passes.

## Management commands

```text
setup
setup --check
verify
verify --live
doctor
hosts
update
uninstall
```

## Safety

TaskDelegate never authorizes delegated agents to commit, push, rewrite history, read credentials, or write outside the project. Every result has `reviewRequired: true` and `commitAllowed: false`.
