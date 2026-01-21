import { getCurrentBranch, getDefaultBranch } from "../lib/git";
import { promptSelect } from "../lib/prompts";

export type WorktreeSource = "current" | "origin";

interface WorktreeSourceResult {
  source: WorktreeSource;
  baseBranch: string;
}

export async function promptWorktreeSource(): Promise<WorktreeSourceResult> {
  const currentBranch = await getCurrentBranch();
  const defaultBranch = await getDefaultBranch();
  const originBranch = defaultBranch ? `origin/${defaultBranch}` : "origin/main";

  const options = [
    {
      value: "current" as WorktreeSource,
      label: `From current branch`,
      hint: currentBranch || "current HEAD",
    },
    {
      value: "origin" as WorktreeSource,
      label: `From ${originBranch}`,
      hint: "latest from remote",
    },
  ];

  const source = await promptSelect<WorktreeSource>({
    message: "Create worktree from which base?",
    options,
  });

  if (source === "current") {
    return { source, baseBranch: currentBranch || "HEAD" };
  }

  return { source, baseBranch: originBranch };
}
