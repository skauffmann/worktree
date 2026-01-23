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

  // Default to npm if no lock file found
  return "npm";
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

async function isGitignored(filePath: string): Promise<boolean> {
  const isTracked = await isFileTrackedByGit(filePath);
  if (isTracked) return false;

  const result = await $`git check-ignore --quiet ${filePath}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function copyDirectoryRecursive(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  await mkdir(targetPath, { recursive: true });
  const entries = await readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const sourceEntryPath = join(sourcePath, entry.name);
    const targetEntryPath = join(targetPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourceEntryPath, targetEntryPath);
    } else if (entry.isFile()) {
      await copyFile(sourceEntryPath, targetEntryPath);
    }
  }
}

export async function findGeneratedFiles(dir: string): Promise<string[]> {
  const generatedFiles: string[] = [];
  await findGeneratedFilesRecursive(dir, dir, generatedFiles);
  return generatedFiles;
}

async function findGeneratedFilesRecursive(
  rootDir: string,
  currentDir: string,
  generatedFiles: string[]
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    const hasGenerated = entry.name.toLowerCase().includes("generated");

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }

      if (hasGenerated) {
        const ignored = await isGitignored(fullPath);
        if (ignored) {
          const relativePath = relative(rootDir, fullPath);
          generatedFiles.push(relativePath);
          continue;
        }
      }

      await findGeneratedFilesRecursive(rootDir, fullPath, generatedFiles);
    } else if (entry.isFile() && hasGenerated) {
      const ignored = await isGitignored(fullPath);
      if (ignored) {
        const relativePath = relative(rootDir, fullPath);
        generatedFiles.push(relativePath);
      }
    }
  }
}

export async function copyGeneratedFiles(
  sourceDir: string,
  targetDir: string,
  items: string[]
): Promise<void> {
  for (const item of items) {
    const sourcePath = join(sourceDir, item);
    const targetPath = join(targetDir, item);
    const stats = await stat(sourcePath);

    if (stats.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
    } else if (stats.isFile()) {
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
}
