import { detectPackageManager } from "../lib/files";
import * as p from "@clack/prompts";
import { $ } from "bun";

export async function installDependenciesOperation(mainRepoPath: string, worktreePath: string): Promise<void> {
  const spinner = p.spinner();

  const pm = await detectPackageManager(mainRepoPath);
  spinner.start(`Installing dependencies with ${pm}...`);
  const installResult = await $`cd ${worktreePath} && ${pm} install`
    .nothrow()
    .quiet();
  if (installResult.exitCode === 0) {
    spinner.stop(`Dependencies installed with ${pm}.`);
  } else {
    spinner.stop(`Warning: Failed to install dependencies with ${pm}.`);
  }

}
