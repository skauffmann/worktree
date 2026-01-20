#!/usr/bin/env bun

import { worktreeCommand } from "./command.ts";

async function main() {
  const branchArg = process.argv[2];
  await worktreeCommand(branchArg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
