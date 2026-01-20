import { createWorktree } from "../lib/git";
import * as p from "@clack/prompts";

export async function createWorktreeOperation(path: string, branch: string, shouldCreateBranch: boolean = true, baseBranch?: string): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Creating worktree...");

  const createResult = await createWorktree(
    path,
    branch,
    shouldCreateBranch,
    baseBranch
  );

  if (!createResult.success) {
    spinner.stop("Failed to create worktree.");
    p.cancel(createResult.error || "Unknown error");
    process.exit(1);
  }
  spinner.stop("Worktree created.");

}
