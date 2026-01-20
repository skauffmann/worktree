import { hasPackageJson } from "../lib/files";
import { promptConfirm } from "../lib/prompts";

export async function promptInstallDependencies(path: string): Promise<boolean> {
  const hasPackage = await hasPackageJson(path);

  if (hasPackage) {
    return promptConfirm({
      message: "Install dependencies after creation?",
      initialValue: true,
    });
  }
  return false
}
