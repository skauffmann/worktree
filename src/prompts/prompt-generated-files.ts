import { findGeneratedFiles } from "../lib/files";
import { promptMultiselect, ui } from "../lib/prompts";

export interface GeneratedFilesResult {
  generatedFiles: string[];
  shouldCopy: boolean;
}

export async function promptGeneratedFiles(
  path: string
): Promise<GeneratedFilesResult> {
  const generatedFiles = await findGeneratedFiles(path);

  if (generatedFiles.length === 0) {
    return { generatedFiles: [], shouldCopy: false };
  }

  ui.note(
    `Found ${generatedFiles.length} gitignored file(s)/folder(s) with "generated" in name or ".gen" extension`,
    "Generated Files"
  );

  const selected = await promptMultiselect<string>({
    message: "Select generated files/folders to copy to new worktree:",
    options: generatedFiles.map((file) => ({
      value: file,
      label: file,
    })),
    initialValues: generatedFiles,
    required: false,
  });

  if (selected.length === 0) {
    return { generatedFiles: [], shouldCopy: false };
  }

  return {
    generatedFiles: selected,
    shouldCopy: true,
  };
}
