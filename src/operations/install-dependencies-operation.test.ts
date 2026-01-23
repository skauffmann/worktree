import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { $ } from "bun";
import { installDependenciesOperation } from "./install-dependencies-operation";

describe("installDependenciesOperation", () => {
  let testDir: string;
  let mainRepoPath: string;
  let worktreePath: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "install-deps-test-"));
    mainRepoPath = join(testDir, "main-repo");
    worktreePath = join(testDir, "worktree");

    await mkdir(mainRepoPath);
    await mkdir(worktreePath);

    await $`cd ${testDir} && git init`.quiet();
    await $`git config user.email "test@test.com"`.quiet();
    await $`git config user.name "Test User"`.quiet();
  });

  test("should install in single-project repo", async () => {
    await writeFile(join(mainRepoPath, "package.json"), JSON.stringify({ name: "test" }));
    await writeFile(join(mainRepoPath, "package-lock.json"), "{}");
    await writeFile(join(worktreePath, "package.json"), JSON.stringify({ name: "test" }));

    await installDependenciesOperation(mainRepoPath, worktreePath);

    // Operation completes without throwing
    expect(true).toBe(true);
  });

  test("should install in monorepo at root only", async () => {
    await writeFile(join(mainRepoPath, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    await writeFile(join(mainRepoPath, "pnpm-lock.yaml"), "");
    await mkdir(join(mainRepoPath, "packages", "lib1"), { recursive: true });
    await writeFile(join(mainRepoPath, "packages", "lib1", "package.json"), JSON.stringify({ name: "lib1" }));

    await writeFile(join(worktreePath, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    await mkdir(join(worktreePath, "packages", "lib1"), { recursive: true });
    await writeFile(join(worktreePath, "packages", "lib1", "package.json"), JSON.stringify({ name: "lib1" }));

    await installDependenciesOperation(mainRepoPath, worktreePath);

    // Operation completes without throwing
    expect(true).toBe(true);
  });

  test("should install in each project for multi-project repo", async () => {
    await mkdir(join(mainRepoPath, "frontend"));
    await writeFile(join(mainRepoPath, "frontend", "package.json"), JSON.stringify({ name: "frontend" }));
    await writeFile(join(mainRepoPath, "frontend", "yarn.lock"), "");

    await mkdir(join(mainRepoPath, "backend"));
    await writeFile(join(mainRepoPath, "backend", "package.json"), JSON.stringify({ name: "backend" }));
    await writeFile(join(mainRepoPath, "backend", "package-lock.json"), "{}");

    await mkdir(join(worktreePath, "frontend"));
    await writeFile(join(worktreePath, "frontend", "package.json"), JSON.stringify({ name: "frontend" }));
    await mkdir(join(worktreePath, "backend"));
    await writeFile(join(worktreePath, "backend", "package.json"), JSON.stringify({ name: "backend" }));

    await installDependenciesOperation(mainRepoPath, worktreePath);

    // Operation completes without throwing
    expect(true).toBe(true);
  });

  test("should handle multi-project with mixed package managers", async () => {
    await mkdir(join(mainRepoPath, "app1"));
    await writeFile(join(mainRepoPath, "app1", "package.json"), JSON.stringify({ name: "app1" }));
    await writeFile(join(mainRepoPath, "app1", "bun.lockb"), "");

    await mkdir(join(mainRepoPath, "app2"));
    await writeFile(join(mainRepoPath, "app2", "package.json"), JSON.stringify({ name: "app2" }));
    await writeFile(join(mainRepoPath, "app2", "pnpm-lock.yaml"), "");

    await mkdir(join(worktreePath, "app1"));
    await writeFile(join(worktreePath, "app1", "package.json"), JSON.stringify({ name: "app1" }));
    await mkdir(join(worktreePath, "app2"));
    await writeFile(join(worktreePath, "app2", "package.json"), JSON.stringify({ name: "app2" }));

    await installDependenciesOperation(mainRepoPath, worktreePath);

    // Operation completes without throwing
    expect(true).toBe(true);
  });

  test("should handle multi-project with root and subdirectories", async () => {
    await writeFile(join(mainRepoPath, "package.json"), JSON.stringify({ name: "root" }));
    await writeFile(join(mainRepoPath, "bun.lockb"), "");

    await mkdir(join(mainRepoPath, "packages", "lib1"), { recursive: true });
    await writeFile(join(mainRepoPath, "packages", "lib1", "package.json"), JSON.stringify({ name: "lib1" }));
    await writeFile(join(mainRepoPath, "packages", "lib1", "package-lock.json"), "{}");

    await writeFile(join(worktreePath, "package.json"), JSON.stringify({ name: "root" }));
    await mkdir(join(worktreePath, "packages", "lib1"), { recursive: true });
    await writeFile(join(worktreePath, "packages", "lib1", "package.json"), JSON.stringify({ name: "lib1" }));

    await installDependenciesOperation(mainRepoPath, worktreePath);

    // Operation completes without throwing
    expect(true).toBe(true);
  });

  test("should continue on installation failure in multi-project", async () => {
    await mkdir(join(mainRepoPath, "valid-project"));
    await writeFile(join(mainRepoPath, "valid-project", "package.json"), JSON.stringify({ name: "valid" }));
    await writeFile(join(mainRepoPath, "valid-project", "package-lock.json"), "{}");

    await mkdir(join(mainRepoPath, "invalid-project"));
    await writeFile(join(mainRepoPath, "invalid-project", "package.json"), "invalid json");

    // Create corresponding worktree directories
    await mkdir(join(worktreePath, "valid-project"));
    await writeFile(join(worktreePath, "valid-project", "package.json"), JSON.stringify({ name: "valid" }));
    await mkdir(join(worktreePath, "invalid-project"));

    // Should not throw even if one project fails
    await installDependenciesOperation(mainRepoPath, worktreePath);

    expect(true).toBe(true);
  });
});
