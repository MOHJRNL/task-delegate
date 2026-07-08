# Publishing TaskDelegate

TaskDelegate is prepared for two public distribution paths:

1. GitHub skill distribution through `npx skills add`.
2. npm CLI distribution through `npx task-delegate`.

Official repository:

```text
https://github.com/MOHJRNL/task-delegate
```

## Before publishing

Validate:

```bash
npm run check
npm test
npm run pack:dry-run
npm run doctor
```

Confirm `package.json` points to:

```text
https://github.com/MOHJRNL/task-delegate
```

## GitHub skill installation path

Users can install the skill directly from GitHub with:

```bash
npx skills add MOHJRNL/task-delegate --skill task-delegate
```

This installs the skill package from:

```text
skills/task-delegate/
```

The adapters are bundled under:

```text
skills/task-delegate/scripts/adapters/
```

Users do not install adapters separately.

## GitHub-only npx usage before npm publish

Users can run the CLI directly from the public GitHub repo:

```bash
npx github:MOHJRNL/task-delegate --help
npx github:MOHJRNL/task-delegate doctor
```

## npm CLI publishing path

Login:

```bash
npm login
npm whoami
```

Publish unscoped if available:

```bash
npm publish
```

Users can then run:

```bash
npx task-delegate --help
npx task-delegate doctor
npx task-delegate run --backend opencode --mode safe-auto --brief brief.md --cd .
```

## Scoped package fallback

If `task-delegate` is unavailable on npm, change `package.json`:

```json
{
  "name": "@mohjrnl/task-delegate",
  "bin": {
    "task-delegate": "bin/task-delegate.mjs"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Publish:

```bash
npm publish --access public
```

Users can then run:

```bash
npx @mohjrnl/task-delegate --help
npx @mohjrnl/task-delegate doctor
```

## Attribution and forks

TaskDelegate uses Apache-2.0 and ships a `NOTICE` file. Forks and derivative packages should keep the license and NOTICE attribution.

GitHub forks created through GitHub will show the upstream fork relationship automatically. npm packages cannot force a visual fork relationship, so the license/NOTICE files are the portable attribution mechanism.
