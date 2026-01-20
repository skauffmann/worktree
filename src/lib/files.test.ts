import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  readFile,
  lstat,
  readlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { $ } from "bun";
import {
  findEnvFiles,
  hasPackageJson,
  detectPackageManager,
  symlinkEnvFiles,
  copyEnvFiles,
} from "./files";

describe("files", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
  });

  afterAll(async () => {
    process.chdir(originalCwd);
  });

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "files-test-"));
    process.chdir(testDir);

    await $`git init`.quiet();
    await $`git config user.email "test@test.com"`.quiet();
    await $`git config user.name "Test User"`.quiet();
  });

  describe("findEnvFiles", () => {
    test("should find .env files in root directory", async () => {
      await writeFile(join(testDir, ".env"), "SECRET=123");
      await writeFile(join(testDir, ".env.local"), "LOCAL=456");

      const envFiles = await findEnvFiles(testDir);

      expect(envFiles).toContain(".env");
      expect(envFiles).toContain(".env.local");
    });

    test("should find .env files in subdirectories", async () => {
      await mkdir(join(testDir, "subdir"));
      await writeFile(join(testDir, "subdir", ".env"), "NESTED=789");

      const envFiles = await findEnvFiles(testDir);

      expect(envFiles).toContain(join("subdir", ".env"));
    });

    test("should not include tracked .env files", async () => {
      await writeFile(join(testDir, ".env.tracked"), "TRACKED=true");
      await $`git add .env.tracked`.quiet();
      await $`git commit -m "Add tracked env"`.quiet();

      await writeFile(join(testDir, ".env.untracked"), "UNTRACKED=true");

      const envFiles = await findEnvFiles(testDir);

      expect(envFiles).not.toContain(".env.tracked");
      expect(envFiles).toContain(".env.untracked");
    });

    test("should skip node_modules directory", async () => {
      await mkdir(join(testDir, "node_modules"));
      await writeFile(join(testDir, "node_modules", ".env"), "NM_SECRET=abc");

      const envFiles = await findEnvFiles(testDir);

      expect(envFiles).not.toContain(join("node_modules", ".env"));
    });

    test("should skip .git directory", async () => {
      await writeFile(join(testDir, ".git", ".env"), "GIT_SECRET=xyz");

      const envFiles = await findEnvFiles(testDir);

      expect(envFiles).not.toContain(join(".git", ".env"));
    });

    test("should return empty array when no .env files exist", async () => {
      const envFiles = await findEnvFiles(testDir);
      expect(envFiles).toEqual([]);
    });
  });

  describe("hasPackageJson", () => {
    test("should return true when package.json exists", async () => {
      await writeFile(join(testDir, "package.json"), "{}");

      const result = await hasPackageJson(testDir);

      expect(result).toBe(true);
    });

    test("should return false when package.json does not exist", async () => {
      const result = await hasPackageJson(testDir);

      expect(result).toBe(false);
    });

    test("should return false when package.json is a directory", async () => {
      await mkdir(join(testDir, "package.json"));

      const result = await hasPackageJson(testDir);

      expect(result).toBe(false);
    });
  });

  describe("detectPackageManager", () => {
    test("should detect bun from bun.lockb", async () => {
      await writeFile(join(testDir, "bun.lockb"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("bun");
    });

    test("should detect bun from bun.lock", async () => {
      await writeFile(join(testDir, "bun.lock"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("bun");
    });

    test("should detect pnpm from pnpm-lock.yaml", async () => {
      await writeFile(join(testDir, "pnpm-lock.yaml"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("pnpm");
    });

    test("should detect yarn from yarn.lock", async () => {
      await writeFile(join(testDir, "yarn.lock"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("yarn");
    });

    test("should detect npm from package-lock.json", async () => {
      await writeFile(join(testDir, "package-lock.json"), "{}");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("npm");
    });

    test("should default to bun when no lock file exists", async () => {
      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("bun");
    });

    test("should prefer bun.lockb over other lock files", async () => {
      await writeFile(join(testDir, "bun.lockb"), "");
      await writeFile(join(testDir, "package-lock.json"), "{}");
      await writeFile(join(testDir, "yarn.lock"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("bun");
    });

    test("should prefer pnpm over yarn and npm", async () => {
      await writeFile(join(testDir, "pnpm-lock.yaml"), "");
      await writeFile(join(testDir, "package-lock.json"), "{}");
      await writeFile(join(testDir, "yarn.lock"), "");

      const pm = await detectPackageManager(testDir);

      expect(pm).toBe("pnpm");
    });
  });

  describe("symlinkEnvFiles", () => {
    test("should create symlinks for env files", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(targetDir);
      await writeFile(join(sourceDir, ".env"), "SOURCE=true");

      await symlinkEnvFiles(sourceDir, targetDir, [".env"]);

      const linkStat = await lstat(join(targetDir, ".env"));
      expect(linkStat.isSymbolicLink()).toBe(true);

      const linkTarget = await readlink(join(targetDir, ".env"));
      expect(linkTarget).toBe(join(sourceDir, ".env"));
    });

    test("should create parent directories if needed", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(join(sourceDir, "nested"));
      await writeFile(join(sourceDir, "nested", ".env"), "NESTED=true");

      await symlinkEnvFiles(sourceDir, targetDir, [join("nested", ".env")]);

      const linkStat = await lstat(join(targetDir, "nested", ".env"));
      expect(linkStat.isSymbolicLink()).toBe(true);
    });

    test("should handle multiple files", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(targetDir);
      await writeFile(join(sourceDir, ".env"), "ENV1=true");
      await writeFile(join(sourceDir, ".env.local"), "ENV2=true");

      await symlinkEnvFiles(sourceDir, targetDir, [".env", ".env.local"]);

      const link1Stat = await lstat(join(targetDir, ".env"));
      const link2Stat = await lstat(join(targetDir, ".env.local"));

      expect(link1Stat.isSymbolicLink()).toBe(true);
      expect(link2Stat.isSymbolicLink()).toBe(true);
    });
  });

  describe("copyEnvFiles", () => {
    test("should copy env files", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(targetDir);
      await writeFile(join(sourceDir, ".env"), "SOURCE_CONTENT=abc");

      await copyEnvFiles(sourceDir, targetDir, [".env"]);

      const content = await readFile(join(targetDir, ".env"), "utf-8");
      expect(content).toBe("SOURCE_CONTENT=abc");

      const fileStat = await lstat(join(targetDir, ".env"));
      expect(fileStat.isSymbolicLink()).toBe(false);
      expect(fileStat.isFile()).toBe(true);
    });

    test("should create parent directories if needed", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(join(sourceDir, "nested"));
      await writeFile(join(sourceDir, "nested", ".env"), "NESTED_CONTENT=xyz");

      await copyEnvFiles(sourceDir, targetDir, [join("nested", ".env")]);

      const content = await readFile(join(targetDir, "nested", ".env"), "utf-8");
      expect(content).toBe("NESTED_CONTENT=xyz");
    });

    test("should handle multiple files", async () => {
      const sourceDir = join(testDir, "source");
      const targetDir = join(testDir, "target");

      await mkdir(sourceDir);
      await mkdir(targetDir);
      await writeFile(join(sourceDir, ".env"), "CONTENT1=a");
      await writeFile(join(sourceDir, ".env.local"), "CONTENT2=b");

      await copyEnvFiles(sourceDir, targetDir, [".env", ".env.local"]);

      const content1 = await readFile(join(targetDir, ".env"), "utf-8");
      const content2 = await readFile(join(targetDir, ".env.local"), "utf-8");

      expect(content1).toBe("CONTENT1=a");
      expect(content2).toBe("CONTENT2=b");
    });
  });
});
