import { removeWorktree } from "../lib/git";
import * as p from "@clack/prompts";

export async function removeWorktreeOperation(path: string): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Removing worktree...");
  const result = await removeWorktree(path);
  if (result.success) {
    spinner.stop("Worktree removed successfully.");
    p.outro("Worktree deleted.");
  } else {
    spinner.stop("Failed to remove worktree.");
    p.cancel(result.error || "Unknown error");
    process.exit(1);
  }
}
