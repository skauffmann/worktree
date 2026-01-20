import * as p from "@clack/prompts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCurrentBranch, getCurrentWorktreePath, getMainRepoPath, isInsideGitRepo, isInsideWorktree, type WorktreeInfo } from "./lib/git";
import { createDotEnvFilesOperation } from "./operations/create-dot-env-files-operation";
import { createWorktreeOperation } from "./operations/create-worktree-operation";
import { installDependenciesOperation } from "./operations/install-dependencies-operation";
import { openInEditorOperation } from "./operations/open-in-editor-operation";
import { removeWorktreeOperation } from "./operations/remove-worktree-operation";
import { prompteBranchAction } from "./prompts/prompt-branch-action";
import { promptDotEnvFiles } from "./prompts/prompt-dot-env-files";
import { promptExistingPathAction } from "./prompts/prompt-existing-path-action";
import { promptInstallDependencies } from "./prompts/prompt-install-dependencies";
import { promptOpenInEditor } from "./prompts/prompt-open-in-editor";
import { promptWorktreeAction } from "./prompts/prompt-worktree-action";

export async function worktreeCommand(branchArg?: string): Promise<void> {
  p.intro("Git Worktree Manager");

  const isGitRepo = await isInsideGitRepo();
  if (!isGitRepo) {
    p.cancel("Not inside a git repository.");
    process.exit(1);
  }

  const inWorktree = await isInsideWorktree();

  if (inWorktree) {
    await handleExistingWorktree();
    return;
  }

  await handleNewWorktree(branchArg);
}

async function handleNewWorktree(defaultBranchName?: string): Promise<void> {
  const worktreeSelection = await promptWorktreeAction(defaultBranchName);

  if (worktreeSelection.type === "existing") {
    await handleExistingWorktree(worktreeSelection.worktree);
    return;
  }

  const mainRepoPath = await getMainRepoPath();
  const createNewBranchResult = await prompteBranchAction(worktreeSelection.branchName);
  const worktreePath = join(
    mainRepoPath,
    "..",
    worktreeSelection.branchName.replace(/\//g, "-")
  );

  if (existsSync(worktreePath)) {
    const action = await promptExistingPathAction(worktreePath);

    if (action === "cancel") {
      p.outro("Operation cancelled.");
      return;
    }

    if (action === "open") {
      await openInEditorOperation(worktreePath);
      return;
    }

    if (action === "delete") {
      await removeWorktreeOperation(worktreePath);
      return;
    }

    if (action === "replace") {
      await removeWorktreeOperation(worktreePath);
    }
  }

  const dotEnvAction = await promptDotEnvFiles(mainRepoPath);
  const shouldInstallDependencies = await promptInstallDependencies(mainRepoPath);
  const shouldOpenInEditor = await promptOpenInEditor();

  await createWorktreeOperation(worktreePath, worktreeSelection.branchName, createNewBranchResult === "create");

  if (shouldOpenInEditor) {
    await openInEditorOperation(worktreePath);
  }

  if (dotEnvAction.action !== "nothing") {
    await createDotEnvFilesOperation(mainRepoPath, worktreePath, dotEnvAction.envFiles, dotEnvAction.action);
  }

  if (shouldInstallDependencies) {
    await installDependenciesOperation(mainRepoPath, worktreePath);
  }

  p.outro(`Worktree ready at: ${worktreePath}`);
}

async function handleExistingWorktree(defaultWorktree?: WorktreeInfo | null): Promise<void> {
  const path = defaultWorktree?.path ?? await getCurrentWorktreePath();
  const branch = defaultWorktree?.branch ?? await getCurrentBranch();

  p.note(
    `Path: ${path}\nBranch: ${branch || "detached"}`,
    !defaultWorktree ? "You are inside a linked worktree" : undefined
  );

  const action = await promptExistingPathAction(path);

  if (action === "cancel") {
    p.outro("Operation cancelled.");
    return;
  }

  if (action === "open") {
    await openInEditorOperation(path);
  }

  if (action === "delete" || action === "replace") {
    await removeWorktreeOperation(path);
  }
}
