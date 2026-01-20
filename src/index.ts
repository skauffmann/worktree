#!/usr/bin/env bun

import * as p from "@clack/prompts";
import { worktreeCommand } from "./command.ts";
import { checkForUpdate, detectInstalledVia, getUpdateCommand } from "./lib/version.ts";

async function main() {
  const branchArg = process.argv[2];

  const intro = ["Git Worktree Manager"];

  const version = await checkForUpdate().catch(() => null);
  if (version) {
    intro.push(`- v${version.currentVersion}`);
    if (!version.updateAvailable) {
      intro.push("(latest)");
    }
  }

  p.intro(intro.join(" "));

  if (version?.updateAvailable) {
    const updateCmd = getUpdateCommand(detectInstalledVia());
    p.note(
      `Current: ${version.currentVersion}\nLatest:  ${version.latestVersion}\n\nRun: ${updateCmd}`,
      "Update available"
    );
  }

  await worktreeCommand(branchArg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
