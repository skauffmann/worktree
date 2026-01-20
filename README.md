# worktree

A delightful CLI for managing Git worktrees. Stop stashing, start shipping.

## Why worktree?

Working on multiple branches simultaneously shouldn't be painful. Git worktrees let you check out multiple branches at once in separate directories, but setting them up manually is tedious: creating the worktree, copying environment files, installing dependencies, opening your editor...

**worktree** handles all of that with a single command and beautiful interactive prompts.

## Features

- **Interactive prompts** — Guided setup with sensible defaults
- **Environment file handling** — Automatically symlink or copy your `.env` files from all directories and subdirectories
- **Dependency installation** — Detects your package manager and installs dependencies
- **Editor integration** — Opens your new worktree in Cursor, VS Code, or Zed
- **Smart detection** — Knows when you're inside a worktree and offers relevant actions
- **Update notifications** — Keeps you informed about new versions

## Installation

```bash
# npm
npm install -g @skauffmann/worktree

# bun
bun install -g @skauffmann/worktree

# pnpm
pnpm add -g @skauffmann/worktree

# yarn
yarn global add @skauffmann/worktree
```

Or run it directly without installing:

```bash
# npx
npx @skauffmann/worktree

# bunx
bunx @skauffmann/worktree
```

## Usage

```bash
# Start the interactive workflow
worktree

# Pre-fill the branch name
worktree feature/awesome-feature
```

### What happens when you run it?

1. **Enter a branch name** — Creates the worktree directory named after your branch
2. **Choose branch action** — Track an existing remote branch or create a new one
3. **Handle environment files** — Symlink (recommended) or copy your `.env` files from all directories and subdirectories
4. **Install dependencies** — Automatically runs your package manager
5. **Open in editor** — Jump straight into coding

### Managing existing worktrees

When you run `worktree` from inside an existing worktree (or when worktrees exist), you get additional options:

- **Open** — Open the worktree in your editor
- **Replace** — Delete and recreate the worktree
- **Delete** — Remove the worktree completely

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKTREE_EDITOR` | Editor to open worktrees in (`cursor`, `code`, `zed`) | Auto-detected |
| `WORKTREE_SKIP_UPDATE_CHECK` | Skip the update check on startup | `false` |

### Examples

```bash
# Always use VS Code
export WORKTREE_EDITOR=code

# Disable update checks
export WORKTREE_SKIP_UPDATE_CHECK=1
```

## How it works

```
your-repo/                    # Main repository
├── .git/
├── .env                      # Root environment file
├── apps/
│   └── web/.env              # Nested environment files too!
└── src/

your-repo-feature/            # Worktree created by this CLI
├── .env → ../your-repo/.env              # Symlinked!
├── apps/
│   └── web/.env → ../your-repo/apps/web/.env
└── src/
```

Worktrees are created as siblings to your main repository, with branch names converted to directory-safe formats (slashes become dashes).

## Supported tools

### Package managers

The CLI auto-detects your package manager from lock files:

| Lock file | Package manager |
|-----------|-----------------|
| `bun.lockb` or `bun.lock` | bun |
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `package-lock.json` | npm |

If no lock file is found, **bun** is used by default.

### Editors

Editors are auto-detected in this order: **Cursor** → **VS Code** → **Zed**

You can override this with the `WORKTREE_EDITOR` environment variable.

If no editor is found, the worktree directory opens in your system file explorer.

## License

MIT
