import { promptSelect } from "../lib/prompts";

export type InWorktreeAction = "create" | "manage";

export async function promptInWorktreeAction(): Promise<InWorktreeAction> {
  return promptSelect<InWorktreeAction>({
    message: "What would you like to do?",
    options: [
      { value: "create", label: "Create new worktree", hint: "create a new worktree" },
      { value: "manage", label: "Manage current worktree", hint: "open, delete, or replace" },
    ],
  });
}
