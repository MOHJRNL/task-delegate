# Permission policy

TaskDelegate optimizes for efficient delegation without giving backend agents ownership of the repository.

## Universal hard rules

Backend agents must not:

- commit
- push
- reset hard
- clean files
- rewrite history
- read secrets
- read `.env` files
- write outside the project directory
- install packages unless explicitly allowed

## Modes

| Mode | Description |
|---|---|
| `plan` | Analyze and propose a plan only. |
| `manual` | Use conservative/manual backend permissions. |
| `safe-auto` | Non-interactive execution with deny rules. Stable only for OpenCode in v0.1. |

## OpenCode `safe-auto`

OpenCode supports `--auto`, which auto-approves permission requests that are not explicitly denied. TaskDelegate sets `OPENCODE_PERMISSION` with restrictive deny/ask rules for `safe-auto`.

Default OpenCode permission profile:

```json
{
  "read": {
    "*": "allow",
    "*.env": "deny",
    "*.env.*": "deny",
    "*.pem": "deny",
    "*.key": "deny",
    "id_rsa*": "deny"
  },
  "edit": {
    "*": "allow",
    "*.env": "deny",
    "*.env.*": "deny"
  },
  "bash": {
    "*": "ask",
    "git status*": "allow",
    "git diff*": "allow",
    "git log*": "allow",
    "git show*": "allow",
    "git add*": "deny",
    "git commit*": "deny",
    "git push*": "deny",
    "git reset*": "deny",
    "git clean*": "deny",
    "rm *": "deny",
    "rm -rf*": "deny"
  },
  "webfetch": "deny",
  "websearch": "deny",
  "external_directory": "deny"
}
```

## Codex v0.1

Codex is experimental/manual in v0.1. TaskDelegate does not use dangerous bypass modes. The adapter sends strong prompt-level boundaries and relies on Codex CLI sandbox/approval behavior.

## Claude v0.1

Claude is experimental/manual in v0.1. Use `plan` for planning and `manual` for implementation. Do not default to Claude auto mode.
