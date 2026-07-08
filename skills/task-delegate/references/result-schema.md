# Result schema

TaskDelegate writes a compact `result.json` for every run. The orchestrator should read this first and open logs only when needed.

## Schema v0.1

```json
{
  "schemaVersion": "0.1",
  "skill": "task-delegate",
  "backend": "opencode",
  "backendStatus": "stable",
  "mode": "safe-auto",
  "projectDir": "/path/to/project",
  "runDir": "/path/to/project/.task-delegate/runs/...",
  "startedAt": "2026-07-08T00:00:00.000Z",
  "endedAt": "2026-07-08T00:00:00.000Z",
  "durationMs": 12345,
  "exitCode": 0,
  "timedOut": false,
  "brief": {
    "path": "brief.md",
    "lines": 48,
    "maxLines": 120
  },
  "git": {
    "dirtyBefore": false,
    "dirtyAfter": true,
    "changedFiles": ["src/example.ts"],
    "diffStatPath": "diff-stat.txt",
    "changedFilesPath": "changed-files.txt"
  },
  "artifacts": {
    "promptPath": "prompt.md",
    "stdoutPath": "stdout.log",
    "stderrPath": "stderr.log"
  },
  "warnings": [],
  "reviewRequired": true,
  "commitAllowed": false
}
```

## Design principle

Keep `result.json` compact. Do not embed full stdout, stderr, or diff content. Store paths instead.
