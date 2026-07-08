#!/usr/bin/env bash
set -euo pipefail

OWNER="MOHJRNL"
REPO="task-delegate"
DESCRIPTION="Low-context multi-backend delegation for CLI coding agents through compact briefs, bundled adapters, and structured results."
VISIBILITY="public"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it first: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  echo "Repository already exists: https://github.com/$OWNER/$REPO"
else
  gh repo create "$OWNER/$REPO" --$VISIBILITY --description "$DESCRIPTION" --source=. --remote=origin --push
  echo "Created and pushed: https://github.com/$OWNER/$REPO"
  exit 0
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://github.com/$OWNER/$REPO.git"
else
  git remote add origin "https://github.com/$OWNER/$REPO.git"
fi

git branch -M main
git push -u origin main
