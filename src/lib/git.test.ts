import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, writeFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { $ } from "bun";
import {
  isInsideGitRepo,
  isInsideWorktree,
  getMainRepoPath,
  getCurrentWorktreePath,
  getCurrentBranch,
  createWorktree,
  removeWorktree,
  listWorktrees,
  branchExists,
  gitFetch,
} from "./git";

describe("git", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    // realpath to resolve symlinks (macOS /var -> /private/var)
    const tmpDir = await mkdtemp(join(tmpdir(), "worktree-test-"));
    testDir = await realpath(tmpDir);
    process.chdir(testDir);

    await $`git init`.quiet();
    await $`git config user.email "test@test.com"`.quiet();
    await $`git config user.name "Test User"`.quiet();

    await writeFile(join(testDir, "README.md"), "# Test");
    await $`git add .`.quiet();
    await $`git commit -m "Initial commit"`.quiet();
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe("isInsideGitRepo", () => {
    test("should return true when inside a git repo", async () => {
      const result = await isInsideGitRepo();
      expect(result).toBe(true);
    });

    test("should return false when outside a git repo", async () => {
      const outsideDir = await mkdtemp(join(tmpdir(), "not-git-"));
      const prevCwd = process.cwd();
      process.chdir(outsideDir);

      const result = await isInsideGitRepo();
      expect(result).toBe(false);

      process.chdir(prevCwd);
      await rm(outsideDir, { recursive: true, force: true });
    });
  });

  describe("isInsideWorktree", () => {
    test("should return false when in main repo", async () => {
      const result = await isInsideWorktree();
      expect(result).toBe(false);
    });
  });

  describe("getCurrentBranch", () => {
    test("should return current branch name", async () => {
      const branch = await getCurrentBranch();
      expect(branch).toBeTruthy();
      expect(typeof branch).toBe("string");
    });
  });

  describe("getCurrentWorktreePath", () => {
    test("should return the worktree path", async () => {
      const path = await getCurrentWorktreePath();
      expect(path).toBe(testDir);
    });
  });

  describe("getMainRepoPath", () => {
    test("should return path when called from main repo", async () => {
      // getMainRepoPath is designed for linked worktrees; from main repo it returns empty string
      const path = await getMainRepoPath();
      expect(typeof path).toBe("string");
    });
  });

  describe("listWorktrees", () => {
    test("should list worktrees", async () => {
      const worktrees = await listWorktrees();
      expect(worktrees).toBeArray();
      expect(worktrees.length).toBeGreaterThanOrEqual(1);
      expect(worktrees[0]?.isMain).toBe(true);
      expect(worktrees[0]?.path).toBe(testDir);
    });

    test("should parse worktree info correctly", async () => {
      const worktrees = await listWorktrees();
      const mainWorktree = worktrees[0];

      expect(mainWorktree).toHaveProperty("path");
      expect(mainWorktree).toHaveProperty("branch");
      expect(mainWorktree).toHaveProperty("isMain");
    });
  });

  describe("branchExists", () => {
    test("should detect existing local branch", async () => {
      const currentBranch = await getCurrentBranch();
      if (currentBranch) {
        const result = await branchExists(currentBranch);
        expect(result.local).toBe(true);
      }
    });

    test("should return false for non-existent branch", async () => {
      const result = await branchExists("non-existent-branch-xyz-123");
      expect(result.local).toBe(false);
    });
  });

  describe("gitFetch", () => {
    test("should return error when no remote exists", async () => {
      const result = await gitFetch();
      expect(result.success).toBe(false);
    });
  });

  describe("createWorktree and removeWorktree", () => {
    test("should create a new worktree with new branch", async () => {
      const worktreePath = join(testDir, "..", "test-worktree-new");
      const branchName = "test-branch-new";

      const createResult = await createWorktree(worktreePath, branchName, true);
      expect(createResult.success).toBe(true);
      expect(createResult.error).toBeUndefined();

      const worktrees = await listWorktrees();
      const found = worktrees.find((w) => w.branch === branchName);
      expect(found).toBeTruthy();

      const removeResult = await removeWorktree(worktreePath);
      expect(removeResult.success).toBe(true);
    });

    test("should create worktree with existing branch", async () => {
      await $`git branch existing-branch`.quiet();
      const worktreePath = join(testDir, "..", "test-worktree-existing");

      const createResult = await createWorktree(
        worktreePath,
        "existing-branch",
        false
      );
      expect(createResult.success).toBe(true);

      await removeWorktree(worktreePath);
      await $`git branch -D existing-branch`.nothrow().quiet();
    });

    test("should return error for invalid worktree creation", async () => {
      const result = await createWorktree("/invalid/path/that/doesnt/exist", "test", true);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("should configure upstream to track itself when creating new branch", async () => {
      const worktreePath = join(testDir, "..", "test-worktree-upstream");
      const branchName = "test-upstream-branch";

      const createResult = await createWorktree(worktreePath, branchName, true);
      expect(createResult.success).toBe(true);

      const remoteResult = await $`git config branch.${branchName}.remote`.nothrow().quiet();
      expect(remoteResult.stdout.toString().trim()).toBe("origin");

      const mergeResult = await $`git config branch.${branchName}.merge`.nothrow().quiet();
      expect(mergeResult.stdout.toString().trim()).toBe(`refs/heads/${branchName}`);

      await removeWorktree(worktreePath);
    });
  });

  describe("worktree integration", () => {
    test("isInsideWorktree should return true when in linked worktree", async () => {
      const uniqueId = Date.now();
      const worktreePath = join(testDir, "..", `linked-worktree-${uniqueId}`);
      const branchName = `linked-branch-${uniqueId}`;

      const createResult = await createWorktree(worktreePath, branchName, true);
      expect(createResult.success).toBe(true);

      const resolvedWorktreePath = await realpath(worktreePath);
      process.chdir(resolvedWorktreePath);

      const result = await isInsideWorktree();
      expect(result).toBe(true);

      const mainPath = await getMainRepoPath();
      expect(mainPath).toBe(testDir);

      process.chdir(testDir);
      await removeWorktree(resolvedWorktreePath);
    });
  });
});
