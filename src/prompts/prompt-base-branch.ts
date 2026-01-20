import { getCurrentBranch, getDefaultBranch, isOriginAhead } from "../lib/git";
import { promptConfirm } from "../lib/prompts";

export async function promptBaseBranch(): Promise<string | undefined> {
  const currentBranch = await getCurrentBranch();
  const defaultBranch = await getDefaultBranch();

  if (!currentBranch || !defaultBranch || currentBranch !== defaultBranch) {
    return undefined;
  }

  const originStatus = await isOriginAhead(defaultBranch);

  if (!originStatus.exists) {
    return undefined;
  }

  const useOrigin = await promptConfirm({
    message: `Create from origin/${defaultBranch}?`,
    initialValue: true,
  });

  return useOrigin ? `origin/${defaultBranch}` : undefined;
}
