import { gitFetch } from "../lib/git";
import { ui } from "../lib/prompts.ts";

export async function fetchOriginOperation(): Promise<void> {
  const spinner = ui.spinner();
  spinner.start("Fetching from origin...");

  const result = await gitFetch();

  if (result.success) {
    spinner.stop("Fetched latest from origin.");
  } else {
    spinner.stop("Warning: Could not fetch from origin. Continuing with local state.");
  }
}
