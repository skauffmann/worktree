import { promptSelect } from "../lib/prompts";

export type ExistingPathAction = "open" | "replace" | "cancel" | "delete";

export async function promptExistingPathAction(path: string): Promise<ExistingPathAction> {
  return promptSelect<ExistingPathAction>({
    message: "What would you like to do?",
    options: [
      { value: "open", label: "Open", hint: "open existing in editor" },
      { value: "replace", label: "Replace", hint: "delete and recreate worktree" },
      { value: "delete", label: "Delete", hint: "remove worktree" },
      { value: "cancel", label: "Cancel", hint: "abort operation" },
    ],
  });
}
