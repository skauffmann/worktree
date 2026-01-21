import { promptConfirm } from "../lib/prompts";

export async function promptOpenInTerminal(): Promise<boolean> {
  return promptConfirm({
    message: "Open in a new terminal tab?",
    initialValue: false,
  });
}
