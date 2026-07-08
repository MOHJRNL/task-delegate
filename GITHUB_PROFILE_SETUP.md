# GitHub Profile Setup for MOHJRNL/task-delegate

This repo is personalized for the GitHub profile:

```text
MOHJRNL
```

Expected repository URL:

```text
https://github.com/MOHJRNL/task-delegate
```

## Option A — create and push with GitHub CLI

From the repo root:

```bash
git init
git add .
git commit -m "Initial release: TaskDelegate v0.1"
./scripts/create-github-repo.sh
```

## Option B — create empty repo manually, then push

Create an empty public GitHub repo named `task-delegate` under `MOHJRNL`, then run:

```bash
git init
git add .
git commit -m "Initial release: TaskDelegate v0.1"
git branch -M main
git remote add origin https://github.com/MOHJRNL/task-delegate.git
git push -u origin main
```

## Public install commands after push

As an Agent Skill:

```bash
npx skills add MOHJRNL/task-delegate --skill task-delegate
```

As a GitHub-backed npx package before npm publish:

```bash
npx github:MOHJRNL/task-delegate --help
npx github:MOHJRNL/task-delegate doctor
```

After npm publish:

```bash
npx task-delegate --help
npx task-delegate doctor
```
