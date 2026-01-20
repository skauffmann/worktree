const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PLATFORMS = {
  "darwin-arm64": "@skauffmann/worktree-darwin-arm64",
  "darwin-x64": "@skauffmann/worktree-darwin-x64",
  "linux-x64": "@skauffmann/worktree-linux-x64",
  "linux-arm64": "@skauffmann/worktree-linux-arm64",
  "win32-x64": "@skauffmann/worktree-win32-x64",
};

const VERSION = require("../package.json").version;

async function main() {
  const platformKey = `${process.platform}-${process.arch}`;
  const packageName = PLATFORMS[platformKey];

  if (!packageName) {
    console.warn(`worktree: Unsupported platform ${platformKey}, skipping binary download`);
    return;
  }

  const binaryName = process.platform === "win32" ? "worktree.exe" : "worktree";

  // Check if binary already exists from optionalDependencies
  try {
    require.resolve(`${packageName}/bin/${binaryName}`);
    return; // Binary exists, nothing to do
  } catch (e) {
    // Binary not found, need to download
  }

  console.log(`worktree: Downloading binary for ${platformKey}...`);

  const packageShortName = packageName.split("/")[1];
  const tarballUrl = `https://registry.npmjs.org/${packageName}/-/${packageShortName}-${VERSION}.tgz`;
  const fallbackDir = path.join(__dirname, "..", "bin-fallback");

  try {
    fs.mkdirSync(fallbackDir, { recursive: true });

    await downloadAndExtract(tarballUrl, fallbackDir, binaryName);

    // Set executable permissions on Unix
    if (process.platform !== "win32") {
      fs.chmodSync(path.join(fallbackDir, binaryName), 0o755);
    }

    console.log(`worktree: Binary installed successfully`);
  } catch (error) {
    console.warn(`worktree: Failed to download binary: ${error.message}`);
    console.warn(`worktree: The CLI may not work. Try reinstalling.`);
  }
}

function downloadAndExtract(url, destDir, binaryName) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadAndExtract(response.headers.location, destDir, binaryName)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          extractBinaryFromTarball(buffer, destDir, binaryName);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      response.on("error", reject);
    });

    request.on("error", reject);
  });
}

function extractBinaryFromTarball(tarballBuffer, destDir, binaryName) {
  // Decompress gzip
  const tarBuffer = zlib.gunzipSync(tarballBuffer);

  // Simple tar extraction - looking for bin/<binaryName>
  const targetPath = `package/bin/${binaryName}`;
  let offset = 0;

  while (offset < tarBuffer.length) {
    // Read header (512 bytes)
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header[0] === 0) break; // End of archive

    // Extract filename (first 100 bytes, null-terminated)
    let nameEnd = 0;
    while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
    const name = header.subarray(0, nameEnd).toString("utf-8");

    // Extract file size (octal, bytes 124-135)
    const sizeStr = header.subarray(124, 136).toString("utf-8").trim();
    const size = parseInt(sizeStr, 8) || 0;

    offset += 512; // Move past header

    if (name === targetPath || name === `./${targetPath}`) {
      // Found our binary
      const fileData = tarBuffer.subarray(offset, offset + size);
      fs.writeFileSync(path.join(destDir, binaryName), fileData);
      return;
    }

    // Move to next file (size rounded up to 512-byte boundary)
    offset += Math.ceil(size / 512) * 512;
  }

  throw new Error(`Binary not found in tarball: ${targetPath}`);
}

main().catch((error) => {
  // Don't fail the install if postinstall fails
  console.warn(`worktree postinstall warning: ${error.message}`);
});
