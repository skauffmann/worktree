import { listWorktrees, type WorktreeInfo } from "../lib/git";
import { promptSelect, promptText } from "../lib/prompts";

export type PromptWorktreeActionResult =
  | { type: "existing"; worktree: WorktreeInfo }
  | { type: "new"; branchName: string };

const CREATE_NEW = "__create_new__";

export async function promptWorktreeAction(
  defaultBranchName?: string
): Promise<PromptWorktreeActionResult> {
  const worktrees = await listWorktrees();
  const linkedWorktrees = worktrees.filter((wt) => !wt.isMain);
  const hasExistingWorktree = linkedWorktrees.length > 0;

  if (hasExistingWorktree && !defaultBranchName) {
    const options = [
      ...linkedWorktrees.map((wt) => ({
        value: wt.path,
        label: wt.branch || "detached",
        hint: wt.path,
      })),
      {
        value: CREATE_NEW,
        label: "Create new worktree",
        hint: "enter branch name",
      },
    ];

    const selected = await promptSelect<string>({
      message: "Select a worktree or create a new one:",
      options,
      initialValue: CREATE_NEW,
    });

    if (selected !== CREATE_NEW) {
      const selectedWorktree = linkedWorktrees.find(
        (wt) => wt.path === selected
      )!;
      return { type: "existing", worktree: selectedWorktree };
    }
  }

  const branchName = await promptText({
    message: "Enter worktree name:",
    placeholder: defaultBranchName || "feature/my-feature",
    defaultValue: defaultBranchName,
    validate: (value) => {
      const finalValue = value || defaultBranchName || "";
      if (!finalValue.trim()) return "Worktree name is required";
      if (finalValue.includes(" ")) return "Worktree name cannot contain spaces";
      return undefined;
    },
  });

  return { type: "new", branchName };
}
