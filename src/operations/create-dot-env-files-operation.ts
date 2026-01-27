import { symlinkEnvFiles, copyEnvFiles } from "../lib/files";
import { ui } from "../lib/prompts.ts";

export async function createDotEnvFilesOperation(mainRepoPath: string, worktreePath: string, envFiles: string[], type: "symlink" | "copy"): Promise<void> {
  const spinner = ui.spinner();
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
    ui.note(String(err), "Error");
  }
}
