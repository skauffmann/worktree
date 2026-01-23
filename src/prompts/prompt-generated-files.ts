import { findGeneratedFiles } from "../lib/files";
import { handleCancel } from "../lib/prompts";
import * as p from "@clack/prompts";

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

  p.note(
    `Found ${generatedFiles.length} gitignored file(s)/folder(s) with "generated" in name`,
    "Generated Files"
  );

  const selected = await p.multiselect({
    message: "Select generated files/folders to copy to new worktree:",
    options: generatedFiles.map((file) => ({
      value: file,
      label: file,
    })),
    required: false,
  });

  handleCancel(selected);

  if (Array.isArray(selected) && selected.length === 0) {
    return { generatedFiles: [], shouldCopy: false };
  }

  return {
    generatedFiles: selected as string[],
    shouldCopy: true,
  };
}
