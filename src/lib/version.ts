import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const PACKAGE_NAME = "@skauffmann/worktree";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const CACHE_FILE_PATH = join(homedir(), ".worktree");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 2000;

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

interface VersionCache {
  lastCheck: number;
  latestVersion: string;
}

export function getCurrentVersion(): string {
  // Use require to get version from package.json at runtime
  // This works because Bun resolves the path relative to this file
  const pkg = require("../../package.json");
  return pkg.version;
}

export function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, "").split(".").map(Number);
  const latestParts = latest.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

export async function fetchLatestVersion(): Promise<{
  success: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { version: string };
    return { success: true, version: data.version };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function readCache(): Promise<VersionCache | null> {
  try {
    const content = await readFile(CACHE_FILE_PATH, "utf-8");
    const cache = JSON.parse(content) as VersionCache;
    if (typeof cache.lastCheck === "number" && typeof cache.latestVersion === "string") {
      return cache;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(cache: VersionCache): Promise<void> {
  try {
    await mkdir(dirname(CACHE_FILE_PATH), { recursive: true });
    await writeFile(CACHE_FILE_PATH, JSON.stringify(cache), "utf-8");
  } catch {
    // Ignore write errors
  }
}

async function shouldCheckVersion(): Promise<{
  shouldCheck: boolean;
  cachedVersion?: string;
}> {
  const cache = await readCache();
  if (!cache) {
    return { shouldCheck: true };
  }

  const age = Date.now() - cache.lastCheck;
  if (age > CACHE_TTL_MS) {
    return { shouldCheck: true };
  }

  return { shouldCheck: false, cachedVersion: cache.latestVersion };
}

export async function checkForUpdate(): Promise<VersionCheckResult | null> {
  if (process.env.WORKTREE_SKIP_UPDATE_CHECK) {
    return null;
  }

  const currentVersion = getCurrentVersion();
  const { shouldCheck, cachedVersion } = await shouldCheckVersion();
  let latestVersion: string;

  if (shouldCheck) {
    const result = await fetchLatestVersion();
    if (!result.success || !result.version) {
      return null;
    }
    latestVersion = result.version;
    await writeCache({ lastCheck: Date.now(), latestVersion });
  } else {
    latestVersion = cachedVersion!;
  }

  const updateAvailable = isNewerVersion(currentVersion, latestVersion);
  return {
    currentVersion,
    latestVersion,
    updateAvailable,
  };
}

export type InstalledVia = "npm" | "bun" | "pnpm" | "yarn" | "npx" | "bunx";

export function detectInstalledVia(scriptPath: string = process.argv[1] ?? ""): InstalledVia {
  if (!scriptPath) {
    return "npm";
  }

  // npx execution (temporary directory)
  if (scriptPath.includes("_npx") || scriptPath.includes("/tmp/")) {
    return "npx";
  }

  // bunx execution
  if (scriptPath.includes(".bunx") || scriptPath.includes("bunx")) {
    return "bunx";
  }

  // Bun global installation
  if (scriptPath.includes("/.bun/")) {
    return "bun";
  }

  // pnpm global installation
  if (scriptPath.includes("/.local/share/pnpm/") || scriptPath.includes("/pnpm/")) {
    return "pnpm";
  }

  // Yarn global installation
  if (scriptPath.includes("/.yarn/")) {
    return "yarn";
  }

  // Default to npm
  return "npm";
}

export function getUpdateCommand(pm: InstalledVia): string {
  const commands: Record<InstalledVia, string> = {
    npm: "npm update -g @skauffmann/worktree",
    bun: "bun update -g @skauffmann/worktree",
    pnpm: "pnpm update -g @skauffmann/worktree",
    yarn: "yarn global upgrade @skauffmann/worktree",
    npx: "npx @skauffmann/worktree@latest",
    bunx: "bunx @skauffmann/worktree@latest",
  };
  return commands[pm];
}
