import { copyGeneratedFiles } from "../lib/files";
import { ui } from "../lib/prompts.ts";

export async function copyGeneratedFilesOperation(
  mainRepoPath: string,
  worktreePath: string,
  generatedFiles: string[]
): Promise<void> {
  const spinner = ui.spinner();
  spinner.start("Copying generated files...");
  try {
    await copyGeneratedFiles(mainRepoPath, worktreePath, generatedFiles);
    spinner.stop("Generated files copied.");
  } catch (err) {
    spinner.stop("Warning: Failed to copy generated files.");
    ui.note(String(err), "Error");
  }
}
