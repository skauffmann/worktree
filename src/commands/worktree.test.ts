import { describe, test, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import * as p from "@clack/prompts";
import * as git from "../lib/git";
import * as files from "../lib/files";
import * as prompts from "../lib/prompts";

describe("worktreeCommand", () => {
  let originalExit: typeof process.exit;
  let originalChdir: typeof process.chdir;
  let exitMock: ReturnType<typeof mock>;
  let chdirMock: ReturnType<typeof mock>;
  let introSpy: ReturnType<typeof spyOn>;
  let cancelSpy: ReturnType<typeof spyOn>;
  let outroSpy: ReturnType<typeof spyOn>;
  let noteSpy: ReturnType<typeof spyOn>;
  let spinnerSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalExit = process.exit;
    originalChdir = process.chdir;
    exitMock = mock(() => {
      throw new Error("process.exit called");
    });
    chdirMock = mock(() => {});
    process.exit = exitMock as unknown as typeof process.exit;
    process.chdir = chdirMock as unknown as typeof process.chdir;

    introSpy = spyOn(p, "intro").mockImplementation(() => {});
    cancelSpy = spyOn(p, "cancel").mockImplementation(() => {});
    outroSpy = spyOn(p, "outro").mockImplementation(() => {});
    noteSpy = spyOn(p, "note").mockImplementation(() => {});
    spinnerSpy = spyOn(p, "spinner").mockReturnValue({
      start: mock(() => {}),
      stop: mock(() => {}),
      message: mock(() => {}),
    });
  });

  afterEach(() => {
    process.exit = originalExit;
    process.chdir = originalChdir;
    introSpy.mockRestore();
    cancelSpy.mockRestore();
    outroSpy.mockRestore();
    noteSpy.mockRestore();
    spinnerSpy.mockRestore();
  });

  describe("not in git repository", () => {
    test("should exit with error when not in git repo", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(false);

      try {
        await worktreeCommand();
      } catch (e) {}

      expect(cancelSpy).toHaveBeenCalledWith("Not inside a git repository.");
      expect(exitMock).toHaveBeenCalledWith(1);

      isInsideGitRepoSpy.mockRestore();
    });
  });

  describe("inside linked worktree", () => {
    test("should show worktree info and ask to delete", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(true);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/worktree");
      const getCurrentBranchSpy = spyOn(git, "getCurrentBranch").mockResolvedValue("feature-branch");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);

      await worktreeCommand();

      expect(noteSpy).toHaveBeenCalledWith(
        "Path: /path/to/worktree\nBranch: feature-branch",
        "You are inside a linked worktree"
      );
      expect(promptConfirmSpy).toHaveBeenCalled();
      expect(outroSpy).toHaveBeenCalledWith("No changes made.");

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      getCurrentBranchSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });

    test("should delete worktree when confirmed", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(true);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/worktree");
      const getCurrentBranchSpy = spyOn(git, "getCurrentBranch").mockResolvedValue("feature-branch");
      const getMainRepoPathSpy = spyOn(git, "getMainRepoPath").mockResolvedValue("/path/to/main");
      const removeWorktreeSpy = spyOn(git, "removeWorktree").mockResolvedValue({ success: true });
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(true);

      await worktreeCommand();

      expect(removeWorktreeSpy).toHaveBeenCalledWith("/path/to/worktree");
      expect(outroSpy).toHaveBeenCalledWith("Run: cd /path/to/main");

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      getCurrentBranchSpy.mockRestore();
      getMainRepoPathSpy.mockRestore();
      removeWorktreeSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });

    test("should exit with error when delete fails", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(true);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/worktree");
      const getCurrentBranchSpy = spyOn(git, "getCurrentBranch").mockResolvedValue("feature-branch");
      const getMainRepoPathSpy = spyOn(git, "getMainRepoPath").mockResolvedValue("/path/to/main");
      const removeWorktreeSpy = spyOn(git, "removeWorktree").mockResolvedValue({
        success: false,
        error: "Worktree has changes"
      });
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(true);

      try {
        await worktreeCommand();
      } catch (e) {}

      expect(cancelSpy).toHaveBeenCalledWith("Worktree has changes");
      expect(exitMock).toHaveBeenCalledWith(1);

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      getCurrentBranchSpy.mockRestore();
      getMainRepoPathSpy.mockRestore();
      removeWorktreeSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });
  });

  describe("inside main repo - create new worktree", () => {
    test("should create worktree with new branch", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(false);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/main");
      const listWorktreesSpy = spyOn(git, "listWorktrees").mockResolvedValue([
        { path: "/path/to/main", branch: "main", isMain: true }
      ]);
      const branchExistsSpy = spyOn(git, "branchExists").mockResolvedValue({ local: false, remote: false });
      const createWorktreeSpy = spyOn(git, "createWorktree").mockResolvedValue({ success: true });
      const findEnvFilesSpy = spyOn(files, "findEnvFiles").mockResolvedValue([]);
      const hasPackageJsonSpy = spyOn(files, "hasPackageJson").mockResolvedValue(false);
      const promptTextSpy = spyOn(prompts, "promptText").mockResolvedValue("feature/test");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);

      await worktreeCommand();

      expect(createWorktreeSpy).toHaveBeenCalledWith(
        "/path/to/feature-test",
        "feature/test",
        true
      );
      expect(outroSpy).toHaveBeenCalledWith("Worktree ready at: /path/to/feature-test");

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      listWorktreesSpy.mockRestore();
      branchExistsSpy.mockRestore();
      createWorktreeSpy.mockRestore();
      findEnvFilesSpy.mockRestore();
      hasPackageJsonSpy.mockRestore();
      promptTextSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });

    test("should use existing local branch", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(false);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/main");
      const listWorktreesSpy = spyOn(git, "listWorktrees").mockResolvedValue([
        { path: "/path/to/main", branch: "main", isMain: true }
      ]);
      const branchExistsSpy = spyOn(git, "branchExists").mockResolvedValue({ local: true, remote: false });
      const createWorktreeSpy = spyOn(git, "createWorktree").mockResolvedValue({ success: true });
      const findEnvFilesSpy = spyOn(files, "findEnvFiles").mockResolvedValue([]);
      const hasPackageJsonSpy = spyOn(files, "hasPackageJson").mockResolvedValue(false);
      const promptTextSpy = spyOn(prompts, "promptText").mockResolvedValue("existing-branch");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);

      await worktreeCommand();

      expect(noteSpy).toHaveBeenCalledWith(
        'Branch "existing-branch" already exists locally.',
        "Branch Found"
      );
      expect(createWorktreeSpy).toHaveBeenCalledWith(
        "/path/to/existing-branch",
        "existing-branch",
        false
      );

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      listWorktreesSpy.mockRestore();
      branchExistsSpy.mockRestore();
      createWorktreeSpy.mockRestore();
      findEnvFilesSpy.mockRestore();
      hasPackageJsonSpy.mockRestore();
      promptTextSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });

    test("should handle env files with symlink", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(false);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/main");
      const listWorktreesSpy = spyOn(git, "listWorktrees").mockResolvedValue([
        { path: "/path/to/main", branch: "main", isMain: true }
      ]);
      const branchExistsSpy = spyOn(git, "branchExists").mockResolvedValue({ local: false, remote: false });
      const createWorktreeSpy = spyOn(git, "createWorktree").mockResolvedValue({ success: true });
      const findEnvFilesSpy = spyOn(files, "findEnvFiles").mockResolvedValue([".env", ".env.local"]);
      const symlinkEnvFilesSpy = spyOn(files, "symlinkEnvFiles").mockResolvedValue(undefined);
      const hasPackageJsonSpy = spyOn(files, "hasPackageJson").mockResolvedValue(false);
      const promptTextSpy = spyOn(prompts, "promptText").mockResolvedValue("test-branch");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);
      const promptSelectSpy = spyOn(prompts, "promptSelect").mockResolvedValue("symlink");

      await worktreeCommand();

      expect(symlinkEnvFilesSpy).toHaveBeenCalledWith(
        "/path/to/main",
        "/path/to/test-branch",
        [".env", ".env.local"]
      );

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      listWorktreesSpy.mockRestore();
      branchExistsSpy.mockRestore();
      createWorktreeSpy.mockRestore();
      findEnvFilesSpy.mockRestore();
      symlinkEnvFilesSpy.mockRestore();
      hasPackageJsonSpy.mockRestore();
      promptTextSpy.mockRestore();
      promptConfirmSpy.mockRestore();
      promptSelectSpy.mockRestore();
    });

    test("should exit with error when worktree creation fails", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(false);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/main");
      const listWorktreesSpy = spyOn(git, "listWorktrees").mockResolvedValue([
        { path: "/path/to/main", branch: "main", isMain: true }
      ]);
      const branchExistsSpy = spyOn(git, "branchExists").mockResolvedValue({ local: false, remote: false });
      const createWorktreeSpy = spyOn(git, "createWorktree").mockResolvedValue({
        success: false,
        error: "Git error"
      });
      const findEnvFilesSpy = spyOn(files, "findEnvFiles").mockResolvedValue([]);
      const hasPackageJsonSpy = spyOn(files, "hasPackageJson").mockResolvedValue(false);
      const promptTextSpy = spyOn(prompts, "promptText").mockResolvedValue("test-branch");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);

      try {
        await worktreeCommand();
      } catch (e) {}

      expect(cancelSpy).toHaveBeenCalledWith("Git error");
      expect(exitMock).toHaveBeenCalledWith(1);

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      listWorktreesSpy.mockRestore();
      branchExistsSpy.mockRestore();
      createWorktreeSpy.mockRestore();
      findEnvFilesSpy.mockRestore();
      hasPackageJsonSpy.mockRestore();
      promptTextSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });
  });

  describe("with branch argument", () => {
    test("should use provided branch name", async () => {
      const { worktreeCommand } = await import("./worktree");

      const isInsideGitRepoSpy = spyOn(git, "isInsideGitRepo").mockResolvedValue(true);
      const isInsideWorktreeSpy = spyOn(git, "isInsideWorktree").mockResolvedValue(false);
      const getCurrentWorktreePathSpy = spyOn(git, "getCurrentWorktreePath").mockResolvedValue("/path/to/main");
      const listWorktreesSpy = spyOn(git, "listWorktrees").mockResolvedValue([
        { path: "/path/to/main", branch: "main", isMain: true }
      ]);
      const branchExistsSpy = spyOn(git, "branchExists").mockResolvedValue({ local: false, remote: false });
      const createWorktreeSpy = spyOn(git, "createWorktree").mockResolvedValue({ success: true });
      const findEnvFilesSpy = spyOn(files, "findEnvFiles").mockResolvedValue([]);
      const hasPackageJsonSpy = spyOn(files, "hasPackageJson").mockResolvedValue(false);
      const promptTextSpy = spyOn(prompts, "promptText").mockResolvedValue("cli-branch");
      const promptConfirmSpy = spyOn(prompts, "promptConfirm").mockResolvedValue(false);

      await worktreeCommand("cli-branch");

      expect(promptTextSpy).toHaveBeenCalledWith(expect.objectContaining({
        defaultValue: "cli-branch",
        placeholder: "cli-branch",
      }));

      isInsideGitRepoSpy.mockRestore();
      isInsideWorktreeSpy.mockRestore();
      getCurrentWorktreePathSpy.mockRestore();
      listWorktreesSpy.mockRestore();
      branchExistsSpy.mockRestore();
      createWorktreeSpy.mockRestore();
      findEnvFilesSpy.mockRestore();
      hasPackageJsonSpy.mockRestore();
      promptTextSpy.mockRestore();
      promptConfirmSpy.mockRestore();
    });
  });
});
