import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { z } from "zod/v4";

const DefaultValuesSchema = z.object({
  dotEnvAction: z.enum(["symlink", "copy", "nothing"]).optional(),
  copyGeneratedFiles: z.boolean().optional(),
  installDependencies: z.boolean().optional(),
  openInEditor: z.boolean().optional(),
  openInTerminal: z.boolean().optional(),
});

const RepoConfigSchema = z.object({
  defaultValues: DefaultValuesSchema,
  afterScripts: z.array(z.string()).optional(),
});

const ConfigSchema = z.object({
  terminal: z.string().optional(),
  afterScripts: z.array(z.string()).optional(),
  repositories: z.record(z.string(), RepoConfigSchema).optional(),
});

export type DefaultValues = z.infer<typeof DefaultValuesSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export function getConfigPath(): string {
  return join(homedir(), ".worktree.json");
}

export async function loadConfig(): Promise<{
  success: boolean;
  config: Config | null;
  error?: string;
}> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { success: true, config: null };
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const json = JSON.parse(content);
    const parsed = ConfigSchema.safeParse(json);

    if (!parsed.success) {
      return {
        success: false,
        config: null,
        error: `Invalid config format: ${parsed.error.message}`,
      };
    }

    return { success: true, config: parsed.data };
  } catch (err) {
    return {
      success: false,
      config: null,
      error: `Failed to read config: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function getRepoConfig(
  config: Config | null,
  repoName: string
): RepoConfig | null {
  if (!config?.repositories) {
    return null;
  }
  return config.repositories[repoName] || null;
}

export function getAfterScripts(
  config: Config | null,
  repoName: string
): string[] {
  const globalScripts = config?.afterScripts ?? [];
  const repoScripts = config?.repositories?.[repoName]?.afterScripts ?? [];
  return [...globalScripts, ...repoScripts];
}

export async function saveRepoConfig(
  repoName: string,
  defaultValues: DefaultValues
): Promise<{ success: boolean; error?: string }> {
  const configPath = getConfigPath();

  let existingConfig: Config = {};

  if (existsSync(configPath)) {
    try {
      const content = await readFile(configPath, "utf-8");
      const json = JSON.parse(content);
      const parsed = ConfigSchema.safeParse(json);
      if (parsed.success && parsed.data) {
        existingConfig = parsed.data;
      }
    } catch {
      // Start fresh if existing config is corrupted
    }
  }

  const newConfig: Config = {
    ...existingConfig,
    repositories: {
      ...existingConfig.repositories,
      [repoName]: { ...existingConfig.repositories?.[repoName], defaultValues },
    },
  };

  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Failed to save config: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
