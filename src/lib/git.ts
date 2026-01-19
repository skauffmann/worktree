import { $ } from "bun";

/**
 * Check if current directory is inside a git repository
 */
export async function isInsideGitRepo(): Promise<boolean> {
  const result = await $`git rev-parse --is-inside-work-tree`.nothrow().quiet();
  return result.exitCode === 0 && result.stdout.toString().trim() === "true";
}

/**
 * Detect if we're in a linked worktree vs main repo
 * In a linked worktree, git-dir differs from git-common-dir
 */
export async function isInsideWorktree(): Promise<boolean> {
  const [gitDir, commonDir] = await Promise.all([
    $`git rev-parse --git-dir`.quiet().text(),
    $`git rev-parse --git-common-dir`.quiet().text(),
  ]);

  return gitDir.trim() !== commonDir.trim();
}

/**
 * Get the root path of the main repository
 */
export async function getMainRepoPath(): Promise<string> {
  const commonDir = await $`git rev-parse --git-common-dir`.quiet().text();
  const resolved = await $`dirname ${commonDir.trim()}`.quiet().text();
  return resolved.trim();
}

/**
 * Get current worktree path (top-level directory)
 */
export async function getCurrentWorktreePath(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.quiet().text();
  return result.trim();
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string | null> {
  const result = await $`git branch --show-current`.nothrow().quiet();
  if (result.exitCode !== 0) return null;
  return result.stdout.toString().trim() || null;
}

/**
 * Create a new worktree
 */
export async function createWorktree(
  path: string,
  branch: string,
  createBranch: boolean = true
): Promise<{ success: boolean; error?: string }> {
  let result;

  if (createBranch) {
    result = await $`git worktree add -b ${branch} ${path}`.nothrow().quiet();
  } else {
    result = await $`git worktree add ${path} ${branch}`.nothrow().quiet();
  }

  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr.toString() };
  }
  return { success: true };
}

/**
 * Remove a worktree
 */
export async function removeWorktree(
  path: string
): Promise<{ success: boolean; error?: string }> {
  const result = await $`git worktree remove ${path} --force`.nothrow().quiet();

  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr.toString() };
  }
  return { success: true };
}

export interface WorktreeInfo {
  path: string;
  branch: string | null;
  isMain: boolean;
}

/**
 * List all worktrees
 */
export async function listWorktrees(): Promise<WorktreeInfo[]> {
  const result = await $`git worktree list --porcelain`.nothrow().quiet();
  if (result.exitCode !== 0) return [];

  const output = result.stdout.toString();
  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      current.path = line.slice(9);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice(7).replace("refs/heads/", "");
    } else if (line === "") {
      if (current.path) {
        worktrees.push({
          path: current.path,
          branch: current.branch || null,
          isMain: worktrees.length === 0,
        });
      }
      current = {};
    }
  }

  return worktrees;
}

/**
 * Check if a branch exists locally or remotely
 */
export async function branchExists(
  branch: string
): Promise<{ local: boolean; remote: boolean }> {
  const [localResult, remoteResult] = await Promise.all([
    $`git show-ref --verify --quiet refs/heads/${branch}`.nothrow().quiet(),
    $`git ls-remote --exit-code --heads origin ${branch}`.nothrow().quiet(),
  ]);

  return {
    local: localResult.exitCode === 0,
    remote: remoteResult.exitCode === 0,
  };
}
