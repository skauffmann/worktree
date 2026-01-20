import { symlinkEnvFiles, copyEnvFiles } from "../lib/files";
import * as p from "@clack/prompts";

export async function createDotEnvFilesOperation(mainRepoPath: string, worktreePath: string, envFiles: string[], type: "symlink" | "copy"): Promise<void> {
  const spinner = p.spinner();
  spinner.start(
    `${type === "symlink" ? "Symlinking" : "Copying"} env files...`
  );
  try {
    if (type === "symlink") {
      await symlinkEnvFiles(mainRepoPath, worktreePath, envFiles);
    } else {
      await copyEnvFiles(mainRepoPath, worktreePath, envFiles);
    }
    spinner.stop("Env files handled.");
  } catch (err) {
    spinner.stop(`Warning: Failed to ${type} env files.`);
    p.note(String(err), "Error");
  }
}
