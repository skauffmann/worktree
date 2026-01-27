import { detectPackageManager, detectRepoStructure } from "../lib/files";
import { ui } from "../lib/prompts.ts";
import { $ } from "bun";
import { join } from "node:path";

export async function installDependenciesOperation(mainRepoPath: string, worktreePath: string): Promise<void> {
  const repoStructure = await detectRepoStructure(mainRepoPath);

  if (repoStructure.type === "single-project" || repoStructure.type === "monorepo") {
    const pm = await detectPackageManager(mainRepoPath);
    const spinner = ui.spinner();
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

      const spinner = ui.spinner();
      spinner.start(`Installing dependencies [${projectNum}/${totalProjects}]: ${projectName}...`);

      const projectWorktreePath = join(worktreePath, project.relativePath);
      const installResult = await $`cd ${projectWorktreePath} && ${project.packageManager} install`
        .nothrow()
        .quiet();

      if (installResult.exitCode === 0) {
        successCount++;
        spinner.stop(`Dependencies installed [${projectNum}/${totalProjects}]: ${projectName}.`);
      } else {
        failureCount++;
        spinner.stop(`Warning: Installation failed [${projectNum}/${totalProjects}]: ${projectName}.`);
      }
      projectNum++;
    }

    if (failureCount === 0) {
      ui.log.success(`All dependencies installed in ${successCount} project(s).`);
    } else {
      ui.log.warning(`Dependencies installed: ${successCount} succeeded, ${failureCount} failed.`);
    }
  }
}
