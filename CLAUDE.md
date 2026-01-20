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
├── index.ts          # Entry point
├── command.ts        # Main command orchestration
├── lib/              # Core utilities (git, files, editor, prompts)
├── operations/       # Side-effect operations (create/remove worktree, install deps)
└── prompts/          # User interaction (prompt-*.ts files)
```

**Data flow**: Entry → Detection (git/worktree status) → Prompts → Operations → Lib utilities

**Separation of concerns**:
- `lib/` contains pure utilities and low-level operations
- `operations/` contains high-level workflows with side effects
- `prompts/` handles all user interaction via @clack/prompts

## Conventions

- Bun runtime with ES modules
- TypeScript strict mode enabled
- Kebab-case file naming: `create-worktree-operation.ts`
- Operations end with `-operation.ts`, prompts start with `prompt-`
- Tests use `*.test.ts` suffix with Bun's test runner (`describe/test/expect`)
- Async/await for I/O, result objects with `{ success, error }` pattern for error handling
- No unnecessary comments: code should be self-explanatory
