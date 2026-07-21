# Changelog

All notable changes to TaskDelegate are documented here.

## [2.1.0] - 2026-07-21

### Added

- Unified `task-delegate delegate` workflow.
- Canonical seven-target discovery:
  - OpenCode
  - Codex
  - Claude Code
  - Kimi
  - z.ai through OpenCode
  - Grok
  - Antigravity
- Headless Antigravity delegation using explicit workspace binding.
- Bundled setup for Claude Code, shared agent skill directories, Grok, and Antigravity.
- Human-readable target output and machine-readable `--json` output.
- Live verification with bounded concurrency, per-target timing, and progress output.
- One bounded retry for transient launch or timeout failures.
- Normalized `task-delegate.result.v2` output.
- Changed-file attribution when `--allow-dirty` is used.
- Portable Node-based syntax checker.

### Security

- Reject backend-created Git commits.
- Terminate delegated process trees on timeout.
- Protect TaskDelegate run directories from symlink escape.
- Protect installer and uninstaller destinations from unsafe symlinks.
- Limit captured stdout and stderr.
- Canonicalize project directories.
- Remove the verifier's shell-based result lookup.
- Preserve manual review and prohibit automatic commits and pushes.
- Document Antigravity's non-interactive permission boundary.
- Clarify Grok's working-directory and permission behavior.

### Changed

- Manual mode is the default for every public target.
- Auto-select is hidden and intentionally unavailable.
- All seven public targets use consistent `supported` metadata.
- Setup always installs the skill bundled with the current package.
- CLI errors are concise and do not expose stack traces by default.
- Package exports are limited to the skill document and package metadata.
- npm package contents are narrowed to runtime and user-facing files.

### Compatibility

- The legacy `run --brief ...` workflow remains available.
- Node.js `18.17.0` or newer is required.

### Verification

- 42 automated tests passed.
- All seven targets passed live bounded smoke verification before release.
- npm package dry-run passed.

## [0.2.1]

- Previous npm release.
- Brief-based multi-backend delegation interface.
