import { $ } from "bun";
import { resolve, dirname } from "node:path";

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
  return resolve(dirname(commonDir.trim()));
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
  shouldCreateBranch: boolean = true,
  baseBranch?: string
): Promise<{ success: boolean; error?: string }> {
  let result;

  if (shouldCreateBranch) {
    if (baseBranch) {
      result = await $`git worktree add -b ${branch} ${path} ${baseBranch}`.nothrow().quiet();
    } else {
      result = await $`git worktree add -b ${branch} ${path}`.nothrow().quiet();
    }
  } else {
    result = await $`git worktree add ${path} ${branch}`.nothrow().quiet();
  }

  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr.toString() };
  }

  if (shouldCreateBranch) {
    await $`git config branch.${branch}.remote origin`.nothrow().quiet();
    await $`git config branch.${branch}.merge refs/heads/${branch}`.nothrow().quiet();
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

/**
 * Get the repository name from the remote origin URL or directory name
 */
export async function getRepoName(): Promise<string> {
  const result = await $`git config --get remote.origin.url`.nothrow().quiet();
  if (result.exitCode === 0) {
    const url = result.stdout.toString().trim();
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    if (match?.[1]) return match[1];
  }

  const toplevel = await $`git rev-parse --show-toplevel`.quiet().text();
  const parts = toplevel.trim().split("/");
  return parts[parts.length - 1] || "repo";
}

/**
 * Get the default branch name (main or master)
 */
export async function getDefaultBranch(): Promise<string | null> {
  const result = await $`git symbolic-ref refs/remotes/origin/HEAD`.nothrow().quiet();
  if (result.exitCode === 0) {
    const ref = result.stdout.toString().trim();
    return ref.replace("refs/remotes/origin/", "");
  }

  const mainExists = await $`git show-ref --verify --quiet refs/heads/main`.nothrow().quiet();
  if (mainExists.exitCode === 0) return "main";

  const masterExists = await $`git show-ref --verify --quiet refs/heads/master`.nothrow().quiet();
  if (masterExists.exitCode === 0) return "master";

  return null;
}

/**
 * Check if origin remote branch exists and is ahead of local
 */
export async function isOriginAhead(branch: string): Promise<{ exists: boolean; ahead: number }> {
  const remoteRef = `origin/${branch}`;

  const refExists = await $`git show-ref --verify --quiet refs/remotes/${remoteRef}`.nothrow().quiet();
  if (refExists.exitCode !== 0) {
    return { exists: false, ahead: 0 };
  }

  const result = await $`git rev-list --count ${branch}..${remoteRef}`.nothrow().quiet();
  if (result.exitCode !== 0) {
    return { exists: true, ahead: 0 };
  }

  const ahead = parseInt(result.stdout.toString().trim(), 10);
  return { exists: true, ahead };
}
