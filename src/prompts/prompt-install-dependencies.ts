import { detectRepoStructure } from "../lib/files";
import { promptConfirm } from "../lib/prompts";

export async function promptInstallDependencies(path: string): Promise<boolean> {
  const repoStructure = await detectRepoStructure(path);

  if (repoStructure.projects.length === 0) {
    return false;
  }

  let message: string;
  if (repoStructure.type === "multi-project") {
    message = `Install dependencies in all projects after creation? (Found ${repoStructure.projects.length} projects)`;
  } else {
    message = "Install dependencies after creation?";
  }

  return promptConfirm({
    message,
    initialValue: true,
  });
}
