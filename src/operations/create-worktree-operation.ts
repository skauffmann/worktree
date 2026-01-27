import { createWorktree } from "../lib/git";
import { ui } from "../lib/prompts.ts";

export async function createWorktreeOperation(path: string, branch: string, shouldCreateBranch: boolean = true, baseBranch?: string): Promise<void> {
  const spinner = ui.spinner();
  spinner.start("Creating worktree...");

  const createResult = await createWorktree(
    path,
    branch,
    shouldCreateBranch,
    baseBranch
  );

  if (!createResult.success) {
    spinner.stop("Failed to create worktree.");
    ui.cancel(createResult.error || "Unknown error");
    process.exit(1);
  }
  spinner.stop("Worktree created.");

}
