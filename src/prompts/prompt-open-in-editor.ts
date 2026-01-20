import { promptConfirm } from "../lib/prompts";

export async function promptOpenInEditor(): Promise<boolean> {
  return promptConfirm({
    message: `Open in editor after processing?`,
    initialValue: true,
  });

}
