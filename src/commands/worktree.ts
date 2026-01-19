import * as p from "@clack/prompts";
import { $ } from "bun";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import {
  isInsideGitRepo,
  isInsideWorktree,
  getCurrentWorktreePath,
  getMainRepoPath,
  getCurrentBranch,
  createWorktree,
  removeWorktree,
  branchExists,
  listWorktrees,
} from "../lib/git.ts";
import {
  findEnvFiles,
  hasPackageJson,
  detectPackageManager,
  symlinkEnvFiles,
  copyEnvFiles,
} from "../lib/files.ts";
import {
  promptText,
  promptConfirm,
  promptSelect,
} from "../lib/prompts.ts";
import type { EnvFileAction } from "../types.ts";

export async function worktreeCommand(branchArg?: string): Promise<void> {
  p.intro("Git Worktree Manager");

  // Step 1: Verify git repository
  const isGitRepo = await isInsideGitRepo();
  if (!isGitRepo) {
    p.cancel("Not inside a git repository.");
    process.exit(1);
  }

  // Step 2: Check if already in a worktree
  const inWorktree = await isInsideWorktree();

  if (inWorktree) {
    await handleExistingWorktree();
    return;
  }

  // Step 3: We're in main repo - create a new worktree
  await handleNewWorktree(branchArg);
}

async function handleExistingWorktree(): Promise<void> {
  const currentPath = await getCurrentWorktreePath();
  const currentBranch = await getCurrentBranch();

  p.note(
    `Path: ${currentPath}\nBranch: ${currentBranch || "detached"}`,
    "You are inside a linked worktree"
  );

  const shouldDelete = await promptConfirm({
    message: "Would you like to delete this worktree?",
    initialValue: false,
  });

  if (shouldDelete) {
    const spinner = p.spinner();
    spinner.start("Removing worktree...");

    const mainRepo = await getMainRepoPath();
    process.chdir(mainRepo);

    const result = await removeWorktree(currentPath);

    if (result.success) {
      spinner.stop("Worktree removed successfully.");
      p.outro(`Run: cd ${mainRepo}`);
    } else {
      spinner.stop("Failed to remove worktree.");
      p.cancel(result.error || "Unknown error");
      process.exit(1);
    }
  } else {
    p.outro("No changes made.");
  }
}

async function handleNewWorktree(branchArg?: string): Promise<void> {
  const mainRepoPath = await getCurrentWorktreePath();

  // List existing worktrees (exclude main)
  const worktrees = await listWorktrees();
  const linkedWorktrees = worktrees.filter((wt) => !wt.isMain);

  let branchName: string;

  if (linkedWorktrees.length > 0 && !branchArg) {
    // Show selection menu with existing worktrees
    const CREATE_NEW = "__create_new__";
    type WorktreeChoice = string;

    const options = [
      ...linkedWorktrees.map((wt) => ({
        value: wt.path,
        label: wt.branch || "detached",
        hint: wt.path,
      })),
      { value: CREATE_NEW, label: "Create new worktree", hint: "enter branch name" },
    ];

    const selected = await promptSelect<WorktreeChoice>({
      message: "Select a worktree or create a new one:",
      options,
      initialValue: CREATE_NEW,
    });

    if (selected !== CREATE_NEW) {
      // Show action menu for selected worktree
      const selectedWorktree = linkedWorktrees.find((wt) => wt.path === selected)!;
      p.note(
        `Path: ${selectedWorktree.path}\nBranch: ${selectedWorktree.branch || "detached"}`,
        "Selected worktree"
      );

      type WorktreeAction = "open" | "replace" | "delete" | "cancel";
      const action = await promptSelect<WorktreeAction>({
        message: "What would you like to do?",
        options: [
          { value: "open", label: "Open", hint: "open in editor" },
          { value: "delete", label: "Delete", hint: "remove worktree" },
          { value: "cancel", label: "Cancel", hint: "go back" },
        ],
      });

      if (action === "cancel") {
        p.outro("Operation cancelled.");
        return;
      }

      if (action === "open") {
        const spinner = p.spinner();
        spinner.start("Opening in editor...");
        await $`cursor ${selected}`.nothrow().quiet();
        spinner.stop("Opened in editor.");
        p.outro(`Worktree: ${selected}`);
        return;
      }

      if (action === "delete") {
        const spinner = p.spinner();
        spinner.start("Removing worktree...");
        const result = await removeWorktree(selected);
        if (result.success) {
          spinner.stop("Worktree removed successfully.");
          p.outro("Worktree deleted.");
        } else {
          spinner.stop("Failed to remove worktree.");
          p.cancel(result.error || "Unknown error");
          process.exit(1);
        }
        return;
      }
    }
  }

  // Get branch name
  branchName = await promptText({
    message: "Enter worktree name:",
    placeholder: branchArg || "feature/my-feature",
    defaultValue: branchArg,
    validate: (value) => {
      const finalValue = value || branchArg || "";
      if (!finalValue.trim()) return "Worktree name is required";
      if (finalValue.includes(" ")) return "Worktree name cannot contain spaces";
      return undefined;
    },
  });

  // Check if branch is already used by an existing worktree
  const allWorktrees = await listWorktrees();
  const existingWorktree = allWorktrees.find((wt) => wt.branch === branchName);

  if (existingWorktree) {
    p.note(
      `Path: ${existingWorktree.path}\nBranch: ${existingWorktree.branch}`,
      "Worktree already exists for this branch"
    );

    type WorktreeAction = "open" | "delete" | "cancel";
    const action = await promptSelect<WorktreeAction>({
      message: "What would you like to do?",
      options: [
        { value: "open", label: "Open", hint: "open in editor" },
        { value: "delete", label: "Delete", hint: "remove worktree" },
        { value: "cancel", label: "Cancel", hint: "abort operation" },
      ],
    });

    if (action === "cancel") {
      p.outro("Operation cancelled.");
      return;
    }

    if (action === "open") {
      const spinner = p.spinner();
      spinner.start("Opening in editor...");
      await $`cursor ${existingWorktree.path}`.nothrow().quiet();
      spinner.stop("Opened in editor.");
      p.outro(`Worktree: ${existingWorktree.path}`);
      return;
    }

    if (action === "delete") {
      const spinner = p.spinner();
      spinner.start("Removing worktree...");
      const result = await removeWorktree(existingWorktree.path);
      if (result.success) {
        spinner.stop("Worktree removed successfully.");
        p.outro("Worktree deleted.");
      } else {
        spinner.stop("Failed to remove worktree.");
        p.cancel(result.error || "Unknown error");
        process.exit(1);
      }
      return;
    }
  }

  // Check if branch exists
  const exists = await branchExists(branchName);
  let createNewBranch = true;

  if (exists.local) {
    p.note(`Branch "${branchName}" already exists locally.`, "Branch Found");
    createNewBranch = false;
  } else if (exists.remote) {
    const useRemote = await promptConfirm({
      message: `Branch "${branchName}" exists on remote. Track it?`,
      initialValue: true,
    });
    createNewBranch = !useRemote;
  }

  // Determine worktree path (sibling to main repo)
  const worktreePath = join(
    mainRepoPath,
    "..",
    branchName.replace(/\//g, "-")
  );

  // Check if worktree path already exists
  if (existsSync(worktreePath)) {
    p.note(`Path: ${worktreePath}`, "Worktree already exists");

    type ExistingAction = "open" | "replace" | "delete" | "cancel";
    const action = await promptSelect<ExistingAction>({
      message: "What would you like to do?",
      options: [
        { value: "open", label: "Open", hint: "open in editor" },
        { value: "replace", label: "Replace", hint: "delete and recreate" },
        { value: "delete", label: "Delete", hint: "remove worktree" },
        { value: "cancel", label: "Cancel", hint: "abort operation" },
      ],
    });

    if (action === "cancel") {
      p.outro("Operation cancelled.");
      return;
    }

    if (action === "open") {
      const spinner = p.spinner();
      spinner.start("Opening in editor...");
      await $`cursor ${worktreePath}`.nothrow().quiet();
      spinner.stop("Opened in editor.");
      p.outro(`Worktree: ${worktreePath}`);
      return;
    }

    if (action === "delete") {
      const spinner = p.spinner();
      spinner.start("Removing worktree...");
      const result = await removeWorktree(worktreePath);
      if (result.success) {
        spinner.stop("Worktree removed successfully.");
        p.outro("Worktree deleted.");
      } else {
        spinner.stop("Failed to remove worktree.");
        p.cancel(result.error || "Unknown error");
        process.exit(1);
      }
      return;
    }

    if (action === "replace") {
      const spinner = p.spinner();
      spinner.start("Removing existing worktree...");
      // Try to remove as git worktree first
      await $`git worktree remove ${worktreePath} --force`.nothrow().quiet();
      // If that fails, just remove the directory
      if (existsSync(worktreePath)) {
        await rm(worktreePath, { recursive: true, force: true });
      }
      spinner.stop("Existing worktree removed.");
    }
  }

  // Check for .env files
  const envFiles = await findEnvFiles(mainRepoPath);
  let envAction: EnvFileAction = "nothing";

  if (envFiles.length > 0) {
    p.note(
      `Found ${envFiles.length} env file(s): ${envFiles.join(", ")}`,
      "Environment Files"
    );

    envAction = await promptSelect<EnvFileAction>({
      message: "How to handle .env files?",
      initialValue: "symlink",
      options: [
        {
          value: "symlink",
          label: "Symlink",
          hint: "recommended - stays in sync",
        },
        { value: "copy", label: "Copy", hint: "independent copies" },
        { value: "nothing", label: "Nothing", hint: "skip env files" },
      ],
    });
  }

  // Check for package.json
  const hasPackage = await hasPackageJson(mainRepoPath);
  let installDeps = false;

  if (hasPackage) {
    installDeps = await promptConfirm({
      message: "Install dependencies after creation?",
      initialValue: true,
    });
  }

  // Ask about opening in editor
  const openInEditor = await promptConfirm({
    message: "Open in editor (cursor) after creation?",
    initialValue: true,
  });

  // Execute actions
  const spinner = p.spinner();

  // Create worktree
  spinner.start("Creating worktree...");
  const createResult = await createWorktree(
    worktreePath,
    branchName,
    createNewBranch
  );

  if (!createResult.success) {
    spinner.stop("Failed to create worktree.");
    p.cancel(createResult.error || "Unknown error");
    process.exit(1);
  }
  spinner.stop("Worktree created.");

  // Open in editor immediately
  if (openInEditor) {
    spinner.start("Opening in editor...");
    await $`cursor ${worktreePath}`.nothrow().quiet();
    spinner.stop("Opened in editor.");
  }

  // Handle env files
  if (envAction !== "nothing" && envFiles.length > 0) {
    spinner.start(
      `${envAction === "symlink" ? "Symlinking" : "Copying"} env files...`
    );
    try {
      if (envAction === "symlink") {
        await symlinkEnvFiles(mainRepoPath, worktreePath, envFiles);
      } else {
        await copyEnvFiles(mainRepoPath, worktreePath, envFiles);
      }
      spinner.stop("Env files handled.");
    } catch (err) {
      spinner.stop(`Warning: Failed to ${envAction} env files.`);
      p.note(String(err), "Error");
    }
  }

  // Install dependencies
  if (installDeps) {
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
  }

  p.outro(`Worktree ready at: ${worktreePath}`);
}
