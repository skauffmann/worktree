import { readdir, stat, symlink, copyFile, mkdir } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { $ } from "bun";

/**
 * Find all .env* files recursively in a directory that are NOT tracked by git
 * Returns paths relative to the root directory
 */
export async function findEnvFiles(dir: string): Promise<string[]> {
  const envFiles: string[] = [];
  await findEnvFilesRecursive(dir, dir, envFiles);
  return envFiles;
}

async function findEnvFilesRecursive(
  rootDir: string,
  currentDir: string,
  envFiles: string[]
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);

    // Skip node_modules and .git directories
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      await findEnvFilesRecursive(rootDir, fullPath, envFiles);
    } else if (entry.isFile() && entry.name.startsWith(".env")) {
      // Check if file is tracked by git
      const isTracked = await isFileTrackedByGit(fullPath);
      if (!isTracked) {
        // Store path relative to root
        const relativePath = relative(rootDir, fullPath);
        envFiles.push(relativePath);
      }
    }
  }
}

/**
 * Check if a file is tracked by git (exists in the remote repo)
 */
async function isFileTrackedByGit(filePath: string): Promise<boolean> {
  const result = await $`git ls-files --error-unmatch ${filePath}`
    .nothrow()
    .quiet();
  return result.exitCode === 0;
}

/**
 * Check if package.json exists in directory
 */
export async function hasPackageJson(dir: string): Promise<boolean> {
  try {
    const stats = await stat(join(dir, "package.json"));
    return stats.isFile();
  } catch {
    return false;
  }
}

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

/**
 * Detect which package manager to use based on lock files
 */
export async function detectPackageManager(dir: string): Promise<PackageManager> {
  // Check in order of preference
  const lockFiles: { file: string; pm: PackageManager }[] = [
    { file: "bun.lockb", pm: "bun" },
    { file: "bun.lock", pm: "bun" },
    { file: "pnpm-lock.yaml", pm: "pnpm" },
    { file: "yarn.lock", pm: "yarn" },
    { file: "package-lock.json", pm: "npm" },
  ];

  for (const { file, pm } of lockFiles) {
    try {
      const stats = await stat(join(dir, file));
      if (stats.isFile()) {
        return pm;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  // Default to bun if no lock file found
  return "bun";
}

/**
 * Symlink env files from source to target directory
 * Uses absolute paths so symlinks work regardless of location
 * Creates parent directories if needed
 */
export async function symlinkEnvFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const sourcePath = resolve(sourceDir, file);
    const targetPath = join(targetDir, file);
    // Create parent directory if it doesn't exist
    await mkdir(dirname(targetPath), { recursive: true });
    await symlink(sourcePath, targetPath);
  }
}

/**
 * Copy env files from source to target directory
 * Creates parent directories if needed
 */
export async function copyEnvFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const sourcePath = join(sourceDir, file);
    const targetPath = join(targetDir, file);
    // Create parent directory if it doesn't exist
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
}
