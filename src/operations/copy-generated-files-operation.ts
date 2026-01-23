import { copyGeneratedFiles } from "../lib/files";
import * as p from "@clack/prompts";

export async function copyGeneratedFilesOperation(
  mainRepoPath: string,
  worktreePath: string,
  generatedFiles: string[]
): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Copying generated files...");
  try {
    await copyGeneratedFiles(mainRepoPath, worktreePath, generatedFiles);
    spinner.stop("Generated files copied.");
  } catch (err) {
    spinner.stop("Warning: Failed to copy generated files.");
    p.note(String(err), "Error");
  }
}
