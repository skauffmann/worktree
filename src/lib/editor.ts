import { $ } from "bun";

const EDITORS = ["cursor", "code", "zed"] as const;

export type EditorName = (typeof EDITORS)[number] | string;

export async function detectEditor(): Promise<EditorName | null> {
  if (process.env.WORKTREE_EDITOR) return process.env.WORKTREE_EDITOR;

  for (const editor of EDITORS) {
    if (await isAvailable(editor)) return editor;
  }

  return null;
}

async function isAvailable(cmd: string): Promise<boolean> {
  const result = await $`which ${cmd}`.nothrow().quiet();
  return result.exitCode === 0;
}

export async function openInEditor(
  editor: string,
  path: string
): Promise<boolean> {
  const result = await $`${editor} ${path}`.nothrow().quiet();
  return result.exitCode === 0;
}
