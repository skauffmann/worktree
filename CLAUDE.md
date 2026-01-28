# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CLI tool for managing Git worktrees with interactive prompts. It automates worktree creation, environment file handling, dependency installation, and editor integration.

## Commands

```bash
bun run dev          # Run CLI in development
bun run typecheck    # Type check (tsc --noEmit)
bun run test         # Run all tests
bun run test:watch   # Run tests in watch mode
```

To run a single test file:
```bash
bun test src/lib/git.test.ts
```

## Architecture

```
src/
├── index.tsx         # Entry point
├── app.tsx           # Main wizard with state machine
├── hooks/            # React hooks for reusable logic
├── ui/               # React UI components (Ink-based)
└── lib/              # Core utilities (git, files, editor, terminal)
```

**Data flow**: Entry → App (state machine) → UI Components → Hooks → Lib utilities

**Separation of concerns**:
- `lib/` contains pure utilities and low-level operations
- `hooks/` contains reusable logic (useWorktrees, useConfirm, etc.)
- `ui/` contains React components for terminal UI (Ink)

## Conventions

- Bun runtime with ES modules
- TypeScript strict mode enabled
- Kebab-case file naming: `use-worktrees.ts`, `branch-selection.tsx`
- Hooks start with `use-`, UI components are `.tsx` files
- Tests use `*.test.ts` suffix with Bun's test runner (`describe/test/expect`)
- Async/await for I/O, result objects with `{ success, error }` pattern for error handling
- React/Ink for terminal UI with hooks for logic separation
- No unnecessary comments: code should be self-explanatory
