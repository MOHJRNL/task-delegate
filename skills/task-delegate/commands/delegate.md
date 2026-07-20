---
description: Delegate a bounded task to an available CLI coding agent.
---

Use the TaskDelegate skill and run `task-delegate delegate` from the current project.

Rules:
- Show available targets when no target is specified.
- Manual review is the default.
- Do not commit or push delegated changes.
- Review `result.json`, changed files, and verification output before presenting the result.
- Automatic routing and recursive delegation are not enabled in v0.2.
