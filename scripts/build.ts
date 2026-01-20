import { $ } from "bun";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const VERSION = process.env.VERSION || "1.0.0";
const ROOT_DIR = join(import.meta.dir, "..");
const DIST_DIR = join(ROOT_DIR, "dist");

const targets = [
  { bun: "bun-darwin-arm64", platform: "darwin", arch: "arm64", ext: "" },
  { bun: "bun-darwin-x64", platform: "darwin", arch: "x64", ext: "" },
  { bun: "bun-linux-x64", platform: "linux", arch: "x64", ext: "" },
  { bun: "bun-linux-arm64", platform: "linux", arch: "arm64", ext: "" },
  { bun: "bun-windows-x64", platform: "win32", arch: "x64", ext: ".exe" },
];

async function build() {
  console.log(`Building worktree v${VERSION}...\n`);

  // Clean dist directory
  await rm(DIST_DIR, { recursive: true, force: true });

  for (const target of targets) {
    const packageName = `@skauffmann/worktree-${target.platform}-${target.arch}`;
    const distDir = join(DIST_DIR, `${target.platform}-${target.arch}`);
    const binaryName = `worktree${target.ext}`;

    console.log(`Building ${packageName}...`);

    // Create dist directory
    await mkdir(join(distDir, "bin"), { recursive: true });

    // Compile binary
    const entryPoint = join(ROOT_DIR, "src", "index.ts");
    const outfile = join(distDir, "bin", binaryName);

    await $`bun build --compile --minify --target=${target.bun} ${entryPoint} --outfile ${outfile}`;

    // Generate package.json
    const packageJson = {
      name: packageName,
      version: VERSION,
      description: `${target.platform} ${target.arch} binary for worktree`,
      license: "MIT",
      repository: {
        type: "git",
        url: "https://github.com/skauffmann/worktree.git",
      },
      os: [target.platform],
      cpu: [target.arch],
      bin: {
        worktree: `bin/${binaryName}`,
      },
    };

    await writeFile(
      join(distDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    console.log(`  ✓ Built ${packageName}\n`);
  }

  console.log("Build complete! Packages are in dist/");
}

build().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
