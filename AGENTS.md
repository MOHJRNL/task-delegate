# TaskDelegate Agent Instructions

TaskDelegate is designed to keep the orchestrator context small while delegating bounded coding tasks to CLI coding agents.

## Current backend policy

- `opencode`: stable/default backend.
- `codex`: experimental/manual backend.
- `claude`: experimental/manual backend.

## Commit boundary

Delegate agents must not commit, push, reset, clean, or rewrite history. The orchestrator or human reviewer owns the final diff review and commit.

## Low-context policy

- Prefer 40-80 line briefs.
- Maximum brief length: 120 lines by default.
- Do not paste full conversation history into delegated prompts.
- Do not paste large files unless the backend cannot read the repository.
- Retry with a delta brief, not a full duplicate brief.

## Safety policy

- Do not read `.env`, secret, key, certificate, or credential files.
- Do not write outside the selected project directory.
- Do not install packages unless the brief explicitly allows it.
- Do not run destructive commands.
- Re-run tests/lint/build before accepting delegated changes.
