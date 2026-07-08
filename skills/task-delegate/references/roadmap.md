# TaskDelegate roadmap

## v0.1 — Multi-adapter MVP

- OpenCode stable adapter
- Codex experimental adapter
- Claude experimental adapter
- Node.js relay
- compact brief format
- compact `result.json`
- no commit boundary
- dirty working tree preflight
- OpenCode safe-auto permission profile

## v0.2 — Cost and context discipline

- brief budget enforcement improvements
- output budget warnings
- delta retry helper
- optional OpenCode `stats` capture
- backend capability report

## v0.3 — Router Lite

- `--backend auto`
- simple task classifier: simple / standard / complex / sensitive
- backend recommendation before execution
- allow human/orchestrator override

## v0.4 — Efficient backend expansion

Add experimental adapters:

- Kimi Code / Kimi CLI
- Qwen Code
- Gemini CLI
- Aider

Potential later adapters:

- Cursor CLI
- Goose
- Crush
- Devin/Copilot if CLI/API workflow is appropriate

## v0.5 — Cost-aware profiles

- `--profile cheap`
- `--profile balanced`
- `--profile best`
- fallback chain
- token/cost summary where backend exposes usage

## v0.6 — Review/guard layer

- dependency change warning
- suspicious file change detection
- auth/payment/infra file warning
- basic secret scan integration
- generated review summary

## v1.0 — Professional DevSecOps/Product workflow

- GitHub issue to brief
- branch and draft PR flow
- CI result reader
- PR review checklist
- release readiness checklist
- Python reporting layer

## Out of scope for v0.x

- Hugging Face model/dataset/Space delivery
- fully autonomous GitHub PR merging
- unrestricted auto execution
- background task monitoring
