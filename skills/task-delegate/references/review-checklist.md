# Review checklist

Use this after every delegated run.

## Required checks

- Read `result.json` first.
- Check `exitCode` and `warnings`.
- Review `changed-files.txt`.
- Review `diff-stat.txt`.
- Inspect the actual git diff.
- Re-run gates from the brief where practical.
- Confirm no secrets or `.env` files were touched.
- Confirm no package/dependency changes unless allowed.
- Confirm no unrelated files were changed.
- Commit only after review. The backend agent must never commit.

## Red flags

Reject or retry with a delta brief if:

- The backend changed unrelated files.
- The backend skipped the requested gates without explanation.
- The backend installed packages without permission.
- The backend modified lockfiles unexpectedly.
- The backend touched auth/payment/security/infra files without explicit scope.
- The backend produced broad try/catch wrappers instead of fixing root cause.
- Tests were faked, disabled, or weakened.

## Acceptance summary template

```markdown
## Delegated run review

Backend: 
Mode: 
Changed files: 
Gates run: 
Gates passed: 
Gates failed/not run: 
Risks: 
Decision: accept / retry / reject
```
