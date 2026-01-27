import { detectEditor, openInEditor } from "../lib/editor";
import { $ } from "bun";
import { ui } from "../lib/prompts.ts";

export async function openInEditorOperation(path: string): Promise<void> {
  const spinner = ui.spinner();
  spinner.start("Opening in editor...");
  const editor = await detectEditor();

  if (!editor) {
    await openInFileExplorer(path);
    spinner.stop("Opened in file explorer.");
    ui.note(
      "Set WORKTREE_EDITOR or install cursor/code/zed.",
      "No editor found"
    );
    ui.outro(`Worktree: ${path}`);
    return;
  }

  await openInEditor(editor, path);
  spinner.stop("Opened in editor.");
  ui.outro(`Worktree: ${path}`);
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
