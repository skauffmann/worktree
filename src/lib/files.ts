import { readdir, stat, symlink, copyFile, mkdir, readFile } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { $ } from "bun";

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

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      await findEnvFilesRecursive(rootDir, fullPath, envFiles);
    } else if (entry.isFile() && entry.name.startsWith(".env")) {
      const isTracked = await isFileTrackedByGit(fullPath);
      if (!isTracked) {
        const relativePath = relative(rootDir, fullPath);
        envFiles.push(relativePath);
      }
    }
  }
}

async function isFileTrackedByGit(filePath: string): Promise<boolean> {
  const result = await $`git ls-files --error-unmatch ${filePath}`
    .nothrow()
    .quiet();
  return result.exitCode === 0;
}

export async function hasPackageJson(dir: string): Promise<boolean> {
  try {
    const stats = await stat(join(dir, "package.json"));
    return stats.isFile();
  } catch {
    return false;
  }
}

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

export type RepoType = "monorepo" | "multi-project" | "single-project";

export interface ProjectConfig {
  path: string;
  relativePath: string;
  packageManager: PackageManager;
  hasPackageJson: boolean;
}

export interface RepoStructure {
  type: RepoType;
  rootPath: string;
  rootPackageManager?: PackageManager;
  projects: ProjectConfig[];
}

export async function detectPackageManager(dir: string): Promise<PackageManager> {
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
    } catch {}
  }

  return "npm";
}

export async function detectMonorepo(dir: string): Promise<boolean> {
  try {
    const stats = await stat(join(dir, "pnpm-workspace.yaml"));
    if (stats.isFile()) return true;
  } catch {}

  try {
    const stats = await stat(join(dir, "lerna.json"));
    if (stats.isFile()) return true;
  } catch {}

  try {
    const pkgPath = join(dir, "package.json");
    const stats = await stat(pkgPath);
    if (stats.isFile()) {
      const content = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.workspaces) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function findProjectDirectories(rootDir: string): Promise<string[]> {
  const projects: string[] = [];
  await findProjectDirectoriesRecursive(rootDir, rootDir, projects, 0);
  return projects;
}

async function findProjectDirectoriesRecursive(
  rootDir: string,
  currentDir: string,
  projects: string[],
  depth: number
): Promise<void> {
  const maxDepth = 3;
  if (depth > maxDepth) return;

  try {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skipDirs = ["node_modules", ".git", "dist", "build", ".worktrees"];
      if (skipDirs.includes(entry.name) || entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = join(currentDir, entry.name);

      const pkgPath = join(fullPath, "package.json");
      try {
        const stats = await stat(pkgPath);
        if (stats.isFile()) {
          projects.push(fullPath);
        }
      } catch {}

      await findProjectDirectoriesRecursive(rootDir, fullPath, projects, depth + 1);
    }
  } catch {}
}

export async function detectRepoStructure(dir: string): Promise<RepoStructure> {
  const rootPath = resolve(dir);
  const projects: ProjectConfig[] = [];

  const rootHasPackageJson = await hasPackageJson(rootPath);
  const isMonorepo = await detectMonorepo(rootPath);

  if (isMonorepo) {
    const rootPackageManager = rootHasPackageJson ? await detectPackageManager(rootPath) : undefined;
    if (rootHasPackageJson) {
      projects.push({
        path: rootPath,
        relativePath: ".",
        packageManager: rootPackageManager!,
        hasPackageJson: true,
      });
    }
    return {
      type: "monorepo",
      rootPath,
      rootPackageManager,
      projects,
    };
  }

  const subdirProjects = await findProjectDirectories(rootPath);

  if (rootHasPackageJson) {
    const rootPackageManager = await detectPackageManager(rootPath);
    projects.push({
      path: rootPath,
      relativePath: ".",
      packageManager: rootPackageManager,
      hasPackageJson: true,
    });
  }

  for (const projectPath of subdirProjects) {
    const packageManager = await detectPackageManager(projectPath);
    projects.push({
      path: projectPath,
      relativePath: relative(rootPath, projectPath),
      packageManager,
      hasPackageJson: true,
    });
  }

  let type: RepoType;
  if (projects.length === 0) {
    type = "single-project";
  } else if (projects.length === 1 && rootHasPackageJson && subdirProjects.length === 0) {
    type = "single-project";
  } else {
    type = "multi-project";
  }

  const rootPackageManager = rootHasPackageJson ? await detectPackageManager(rootPath) : undefined;

  return {
    type,
    rootPath,
    rootPackageManager,
    projects,
  };
}

export async function symlinkEnvFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const sourcePath = resolve(sourceDir, file);
    const targetPath = join(targetDir, file);
    await mkdir(dirname(targetPath), { recursive: true });
    await symlink(sourcePath, targetPath);
  }
}

export async function copyEnvFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const sourcePath = join(sourceDir, file);
    const targetPath = join(targetDir, file);
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
