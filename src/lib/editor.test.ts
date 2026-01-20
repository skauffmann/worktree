import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { detectEditor, openInEditor } from "./editor";

describe("editor", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.WORKTREE_EDITOR;
    delete process.env.WORKTREE_EDITOR;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.WORKTREE_EDITOR = originalEnv;
    } else {
      delete process.env.WORKTREE_EDITOR;
    }
  });

  describe("detectEditor", () => {
    test("should return WORKTREE_EDITOR if set", async () => {
      process.env.WORKTREE_EDITOR = "nvim";

      const editor = await detectEditor();

      expect(editor).toBe("nvim");
    });

    test("should detect an available editor", async () => {
      const editor = await detectEditor();

      expect(editor).toBeOneOf(["cursor", "code", "zed", null]);
    });

    test("should return null if no editor available and no env var", async () => {
      process.env.PATH = "";

      const editor = await detectEditor();

      expect(editor).toBeNull();
    });
  });

  describe("openInEditor", () => {
    test("should return false for non-existent editor", async () => {
      const result = await openInEditor("nonexistent-editor-xyz", "/tmp");

      expect(result).toBe(false);
    });
  });
});
