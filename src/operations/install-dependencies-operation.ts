import { detectPackageManager, detectRepoStructure } from "../lib/files";
import * as p from "@clack/prompts";
import { $ } from "bun";
import { join } from "node:path";

export async function installDependenciesOperation(mainRepoPath: string, worktreePath: string): Promise<void> {
  const spinner = p.spinner();

  const repoStructure = await detectRepoStructure(mainRepoPath);

  if (repoStructure.type === "single-project" || repoStructure.type === "monorepo") {
    const pm = await detectPackageManager(mainRepoPath);
    spinner.start(`Installing dependencies with ${pm}...`);
    const installResult = await $`cd ${worktreePath} && ${pm} install`
      .nothrow()
      .quiet();
    if (installResult.exitCode === 0) {
      spinner.stop(`Dependencies installed with ${pm}.`);
    } else {
      spinner.stop(`Warning: Failed to install dependencies with ${pm}.`);
    }
  } else {
    const totalProjects = repoStructure.projects.length;
    let successCount = 0;
    let failureCount = 0;

    let projectNum = 1;
    for (const project of repoStructure.projects) {
      const projectName = project.relativePath === "." ? "root" : project.relativePath;

      spinner.start(`Installing dependencies [${projectNum}/${totalProjects}]: ${projectName}...`);

      const projectWorktreePath = join(worktreePath, project.relativePath);
      const installResult = await $`cd ${projectWorktreePath} && ${project.packageManager} install`
        .nothrow()
        .quiet();

      if (installResult.exitCode === 0) {
        successCount++;
      } else {
        failureCount++;
      }
      projectNum++;
    }

    if (failureCount === 0) {
      spinner.stop(`Dependencies installed in ${successCount} project(s).`);
    } else {
      spinner.stop(`Warning: ${successCount} succeeded, ${failureCount} failed.`);
    }
  }
}
