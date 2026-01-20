import { detectEditor, openInEditor } from "../lib/editor";
import { $ } from "bun";
import * as p from "@clack/prompts";

export async function openInEditorOperation(path: string): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Opening in editor...");
  const editor = await detectEditor();

  if (!editor) {
    await openInFileExplorer(path);
    spinner.stop("Opened in file explorer.");
    p.note(
      "Set WORKTREE_EDITOR or install cursor/code/zed.",
      "No editor found"
    );
    p.outro(`Worktree: ${path}`);
    return;
  }

  await openInEditor(editor, path);
  spinner.stop("Opened in editor.");
  p.outro(`Worktree: ${path}`);
}

async function openInFileExplorer(path: string): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    await $`open ${path}`.quiet();
  } else if (platform === "win32") {
    await $`explorer ${path}`.quiet();
  } else {
    await $`xdg-open ${path}`.quiet();
  }
}
