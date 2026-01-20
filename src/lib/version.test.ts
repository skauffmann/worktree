import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { getCurrentVersion, isNewerVersion, detectInstalledVia, getUpdateCommand } from "./version";

describe("version", () => {
  describe("getCurrentVersion", () => {
    test("should return a valid semver string", () => {
      const version = getCurrentVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("isNewerVersion", () => {
    test("should return true when latest major is higher", () => {
      expect(isNewerVersion("1.0.0", "2.0.0")).toBe(true);
    });

    test("should return true when latest minor is higher", () => {
      expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
    });

    test("should return true when latest patch is higher", () => {
      expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
    });

    test("should return false when versions are equal", () => {
      expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    });

    test("should return false when current is higher", () => {
      expect(isNewerVersion("2.0.0", "1.0.0")).toBe(false);
      expect(isNewerVersion("1.1.0", "1.0.0")).toBe(false);
      expect(isNewerVersion("1.0.1", "1.0.0")).toBe(false);
    });

    test("should handle versions with v prefix", () => {
      expect(isNewerVersion("v1.0.0", "v1.0.1")).toBe(true);
      expect(isNewerVersion("v1.0.0", "1.0.1")).toBe(true);
      expect(isNewerVersion("1.0.0", "v1.0.1")).toBe(true);
    });

    test("should handle partial versions", () => {
      expect(isNewerVersion("1.0", "1.0.1")).toBe(true);
      expect(isNewerVersion("1", "1.0.1")).toBe(true);
    });
  });

  describe("detectInstalledVia", () => {
    test("should detect bun from path", () => {
      expect(detectInstalledVia("/Users/test/.bun/install/global/worktree")).toBe("bun");
    });

    test("should detect npm from path", () => {
      expect(detectInstalledVia("/usr/local/lib/node_modules/worktree")).toBe("npm");
    });

    test("should detect pnpm from path", () => {
      expect(detectInstalledVia("/Users/test/.local/share/pnpm/global/worktree")).toBe("pnpm");
    });

    test("should detect yarn from path", () => {
      expect(detectInstalledVia("/Users/test/.yarn/bin/worktree")).toBe("yarn");
    });

    test("should detect npx from path", () => {
      expect(detectInstalledVia("/tmp/npx123/worktree")).toBe("npx");
      expect(detectInstalledVia("/Users/test/_npx/worktree")).toBe("npx");
    });

    test("should detect bunx from path", () => {
      expect(detectInstalledVia("/Users/test/.bunx/worktree")).toBe("bunx");
    });

    test("should default to npm for unknown paths", () => {
      expect(detectInstalledVia("/some/unknown/path")).toBe("npm");
    });

    test("should default to npm for empty path", () => {
      expect(detectInstalledVia("")).toBe("npm");
    });
  });

  describe("getUpdateCommand", () => {
    test("should return correct command for each package manager", () => {
      expect(getUpdateCommand("npm")).toBe("npm update -g @skauffmann/worktree");
      expect(getUpdateCommand("bun")).toBe("bun update -g @skauffmann/worktree");
      expect(getUpdateCommand("pnpm")).toBe("pnpm update -g @skauffmann/worktree");
      expect(getUpdateCommand("yarn")).toBe("yarn global upgrade @skauffmann/worktree");
      expect(getUpdateCommand("npx")).toBe("npx @skauffmann/worktree@latest");
      expect(getUpdateCommand("bunx")).toBe("bunx @skauffmann/worktree@latest");
    });
  });
});
