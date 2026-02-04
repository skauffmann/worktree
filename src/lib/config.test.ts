import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const originalHomedir = await import("node:os").then((m) => m.homedir);

describe("config", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "worktree-config-test-"));
    configPath = join(testDir, ".worktree.json");

    // Mock homedir to return test directory
    mock.module("node:os", () => ({
      homedir: () => testDir,
    }));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    // Reset mock
    mock.module("node:os", () => ({
      homedir: originalHomedir,
    }));
  });

  // Need to re-import after mocking
  async function getConfigModule() {
    // Clear module cache
    delete require.cache[require.resolve("./config")];
    return import("./config");
  }

  describe("getConfigPath", () => {
    test("should return path in home directory", async () => {
      const { getConfigPath } = await getConfigModule();
      const path = getConfigPath();
      expect(path).toBe(join(testDir, ".worktree.json"));
    });
  });

  describe("loadConfig", () => {
    test("should return null config when file does not exist", async () => {
      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(true);
      expect(result.config).toBeNull();
    });

    test("should load valid config", async () => {
      const validConfig = {
        terminal: "iterm",
        repositories: {
          "my-repo": {
            defaultValues: {
              dotEnvAction: "symlink" as const,
              copyGeneratedFiles: true,
              installDependencies: true,
              openInEditor: true,
              openInTerminal: false,
            },
          },
        },
      };
      await writeFile(configPath, JSON.stringify(validConfig));

      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(true);
      expect(result.config).toEqual(validConfig);
    });

    test("should handle empty config file gracefully", async () => {
      await writeFile(configPath, "{}");

      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(true);
      expect(result.config).toEqual({});
    });

    test("should return error for invalid JSON", async () => {
      await writeFile(configPath, "{ invalid json }");

      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read config");
    });

    test("should load config with afterScripts", async () => {
      const configWithScripts = {
        terminal: "iterm",
        afterScripts: ["echo 'global'"],
        repositories: {
          "my-repo": {
            defaultValues: {
              dotEnvAction: "symlink" as const,
            },
            afterScripts: ["bun run db:migrate"],
          },
        },
      };
      await writeFile(configPath, JSON.stringify(configWithScripts));

      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(true);
      expect(result.config?.afterScripts).toEqual(["echo 'global'"]);
      expect(result.config?.repositories?.["my-repo"]?.afterScripts).toEqual(["bun run db:migrate"]);
    });

    test("should return error for invalid schema", async () => {
      const invalidConfig = {
        repositories: {
          "my-repo": {
            defaultValues: {
              dotEnvAction: "invalid-action",
            },
          },
        },
      };
      await writeFile(configPath, JSON.stringify(invalidConfig));

      const { loadConfig } = await getConfigModule();
      const result = await loadConfig();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid config format");
    });
  });

  describe("getRepoConfig", () => {
    test("should return null for null config", async () => {
      const { getRepoConfig } = await getConfigModule();
      const result = getRepoConfig(null, "my-repo");
      expect(result).toBeNull();
    });

    test("should return null for config without repositories", async () => {
      const { getRepoConfig } = await getConfigModule();
      const result = getRepoConfig({}, "my-repo");
      expect(result).toBeNull();
    });

    test("should return null for non-existent repo", async () => {
      const { getRepoConfig } = await getConfigModule();
      const config = {
        repositories: {
          "other-repo": { defaultValues: {} },
        },
      };
      const result = getRepoConfig(config, "my-repo");
      expect(result).toBeNull();
    });

    test("should return repo config when exists", async () => {
      const { getRepoConfig } = await getConfigModule();
      const repoConfig = {
        defaultValues: {
          dotEnvAction: "symlink" as const,
          copyGeneratedFiles: true,
        },
      };
      const config = {
        repositories: {
          "my-repo": repoConfig,
        },
      };
      const result = getRepoConfig(config, "my-repo");
      expect(result).toEqual(repoConfig);
    });
  });

  describe("getAfterScripts", () => {
    test("should return empty array for null config", async () => {
      const { getAfterScripts } = await getConfigModule();
      expect(getAfterScripts(null, "my-repo")).toEqual([]);
    });

    test("should return global scripts only", async () => {
      const { getAfterScripts } = await getConfigModule();
      const config = {
        afterScripts: ["echo 'global'"],
      };
      expect(getAfterScripts(config, "my-repo")).toEqual(["echo 'global'"]);
    });

    test("should return repo scripts only", async () => {
      const { getAfterScripts } = await getConfigModule();
      const config = {
        repositories: {
          "my-repo": {
            defaultValues: {},
            afterScripts: ["bun run db:migrate"],
          },
        },
      };
      expect(getAfterScripts(config, "my-repo")).toEqual(["bun run db:migrate"]);
    });

    test("should merge global and repo scripts with global first", async () => {
      const { getAfterScripts } = await getConfigModule();
      const config = {
        afterScripts: ["echo 'global'"],
        repositories: {
          "my-repo": {
            defaultValues: {},
            afterScripts: ["bun run db:migrate", "bun run seed"],
          },
        },
      };
      expect(getAfterScripts(config, "my-repo")).toEqual([
        "echo 'global'",
        "bun run db:migrate",
        "bun run seed",
      ]);
    });

    test("should return empty array when no scripts defined", async () => {
      const { getAfterScripts } = await getConfigModule();
      const config = {
        repositories: {
          "my-repo": { defaultValues: {} },
        },
      };
      expect(getAfterScripts(config, "my-repo")).toEqual([]);
    });

    test("should not include scripts from other repos", async () => {
      const { getAfterScripts } = await getConfigModule();
      const config = {
        repositories: {
          "other-repo": {
            defaultValues: {},
            afterScripts: ["echo 'other'"],
          },
        },
      };
      expect(getAfterScripts(config, "my-repo")).toEqual([]);
    });
  });

  describe("saveRepoConfig", () => {
    test("should create new config file if it does not exist", async () => {
      const { saveRepoConfig } = await getConfigModule();
      const defaultValues = {
        dotEnvAction: "symlink" as const,
        copyGeneratedFiles: true,
      };

      const result = await saveRepoConfig("my-repo", defaultValues);
      expect(result.success).toBe(true);

      expect(existsSync(configPath)).toBe(true);
      const content = JSON.parse(await readFile(configPath, "utf-8"));
      expect(content.repositories["my-repo"].defaultValues).toEqual(defaultValues);
    });

    test("should preserve other repositories when saving", async () => {
      const existingConfig = {
        terminal: "iterm",
        repositories: {
          "other-repo": {
            defaultValues: {
              dotEnvAction: "copy",
            },
          },
        },
      };
      await writeFile(configPath, JSON.stringify(existingConfig));

      const { saveRepoConfig } = await getConfigModule();
      const result = await saveRepoConfig("my-repo", {
        dotEnvAction: "symlink",
      });
      expect(result.success).toBe(true);

      const content = JSON.parse(await readFile(configPath, "utf-8"));
      expect(content.terminal).toBe("iterm");
      expect(content.repositories["other-repo"]).toEqual(existingConfig.repositories["other-repo"]);
      expect(content.repositories["my-repo"].defaultValues.dotEnvAction).toBe("symlink");
    });

    test("should update existing repo config", async () => {
      const existingConfig = {
        repositories: {
          "my-repo": {
            defaultValues: {
              dotEnvAction: "copy",
            },
          },
        },
      };
      await writeFile(configPath, JSON.stringify(existingConfig));

      const { saveRepoConfig } = await getConfigModule();
      const result = await saveRepoConfig("my-repo", {
        dotEnvAction: "symlink",
        copyGeneratedFiles: true,
      });
      expect(result.success).toBe(true);

      const content = JSON.parse(await readFile(configPath, "utf-8"));
      expect(content.repositories["my-repo"].defaultValues.dotEnvAction).toBe("symlink");
      expect(content.repositories["my-repo"].defaultValues.copyGeneratedFiles).toBe(true);
    });

    test("should preserve afterScripts when saving defaultValues", async () => {
      const existingConfig = {
        repositories: {
          "my-repo": {
            defaultValues: {
              dotEnvAction: "symlink",
            },
            afterScripts: ["bun run db:migrate"],
          },
        },
      };
      await writeFile(configPath, JSON.stringify(existingConfig));

      const { saveRepoConfig } = await getConfigModule();
      const result = await saveRepoConfig("my-repo", {
        dotEnvAction: "copy",
        installDependencies: true,
      });
      expect(result.success).toBe(true);

      const content = JSON.parse(await readFile(configPath, "utf-8"));
      expect(content.repositories["my-repo"].defaultValues.dotEnvAction).toBe("copy");
      expect(content.repositories["my-repo"].defaultValues.installDependencies).toBe(true);
      expect(content.repositories["my-repo"].afterScripts).toEqual(["bun run db:migrate"]);
    });

    test("should start fresh if existing config is corrupted", async () => {
      await writeFile(configPath, "{ invalid json }");

      const { saveRepoConfig } = await getConfigModule();
      const result = await saveRepoConfig("my-repo", {
        dotEnvAction: "symlink",
      });
      expect(result.success).toBe(true);

      const content = JSON.parse(await readFile(configPath, "utf-8"));
      expect(content.repositories["my-repo"].defaultValues.dotEnvAction).toBe("symlink");
    });
  });
});
