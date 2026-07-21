# Result contract

TaskDelegate writes a compact normalized `result.json` for every delegated run. Read this first and open detailed logs only when needed.

## Contract

The current contract identifier is:

```text
task-delegate.result.v2
```

A normalized result includes the selected target, mode, project and run directories, timing, process outcome, changed files, verification data, warnings, and review requirements.

Example:

```json
{
  "schemaVersion": "task-delegate.result.v2",
  "taskId": "example-task-id",
  "target": "codex",
  "mode": "manual",
  "projectDir": "/path/to/project",
  "runDir": "/path/to/project/.task-delegate/runs/example-task-id",
  "startedAt": "2026-07-21T00:00:00.000Z",
  "endedAt": "2026-07-21T00:00:20.000Z",
  "durationMs": 20000,
  "exitCode": 0,
  "timedOut": false,
  "changedFiles": ["src/example.ts"],
  "warnings": [],
  "reviewRequired": true,
  "commitAllowed": false
}
```

## Trust boundary

A backend's own success message is not sufficient proof of completion. The originating agent must verify:

- process exit and timeout state;
- normalized schema validity;
- actual changed files;
- requested output or test result;
- unchanged Git HEAD unless the user explicitly requested otherwise;
- diff safety and scope.

## Design principle

Keep `result.json` compact. Store large stdout, stderr, prompts, and diff data in separate run artifacts and reference their paths.
