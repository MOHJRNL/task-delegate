# TaskDelegate brief template

Use this template to create a compact backend prompt. Keep the brief self-contained, but not bloated.

## Recommended size

- Preferred: 40-80 lines.
- Maximum default: 120 lines.
- Never paste full chat history.
- Never paste large files unless the backend cannot read the repo.

## Template

```markdown
# Task

Describe the exact implementation task in 3-6 lines.

# Goal

What should be true when the task is complete?

# Scope

Allowed:
- 

Not allowed:
- Do not commit.
- Do not push.
- Do not reset, clean, or rewrite git history.
- Do not read secrets, `.env`, keys, certificates, or credentials.
- Do not modify unrelated files.
- Do not install packages unless explicitly allowed.

# Files / areas likely involved

- 

# Acceptance criteria

- 
- 
- 

# Gates to run

```bash
# examples
npm test
npm run lint
npm run build
```

# Output required

Return:
- summary of changes
- files changed
- commands run
- gate results
- unresolved issues
```

## Retry template

For retries, use a delta brief only:

```markdown
# Delta task

Fix only the following issue from the previous run:

# Failure / error

Paste the exact failing command and short error.

# Constraint

Do not redo unrelated work. Do not change files outside the previously touched scope unless necessary.

# Gate to re-run

```bash
...
```
```
