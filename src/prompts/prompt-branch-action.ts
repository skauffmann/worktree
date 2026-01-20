import { branchExists } from "../lib/git";
import * as p from "@clack/prompts";
import { promptConfirm } from "../lib/prompts";

export type PrompteBranchActionResult = "create" | "track" | "duplicate"

export async function prompteBranchAction(branchName: string): Promise<PrompteBranchActionResult> {
  const isBranchExists = await branchExists(branchName);
  if (isBranchExists.local) {
    p.note(`Branch "${branchName}" already exists locally.`, "Branch Found");
    return 'duplicate';
  } else if (isBranchExists.remote) {
    const useRemote = await promptConfirm({
      message: `Branch "${branchName}" exists on remote. Track it?`,
      initialValue: true,
    });
    return useRemote ? 'track' : 'create';
  }
  return 'create';
}
