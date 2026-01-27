import { removeWorktree } from "../lib/git";
import { ui } from "../lib/prompts.ts";

export async function removeWorktreeOperation(path: string): Promise<void> {
  const spinner = ui.spinner();
  spinner.start("Removing worktree...");
  const result = await removeWorktree(path);
  if (result.success) {
    spinner.stop("Worktree removed successfully.");
    ui.outro("Worktree deleted.");
  } else {
    spinner.stop("Failed to remove worktree.");
    ui.cancel(result.error || "Unknown error");
    process.exit(1);
  }
}
