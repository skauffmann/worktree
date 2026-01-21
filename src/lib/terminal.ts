import { $ } from "bun";

type TerminalName =
  | "apple-terminal"
  | "iterm"
  | "warp"
  | "vscode"
  | "ghostty"
  | "kitty"
  | "alacritty"
  | "hyper"
  | "gnome-terminal"
  | "konsole"
  | "xfce4-terminal"
  | "unknown";

interface TerminalInfo {
  name: TerminalName;
  supportsNewTab: boolean;
}

export function detectTerminal(): TerminalInfo {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || "";

  if (process.env.GHOSTTY_RESOURCES_DIR) {
    return { name: "ghostty", supportsNewTab: true };
  }

  if (process.env.ITERM_SESSION_ID) {
    return { name: "iterm", supportsNewTab: true };
  }

  if (process.env.WARP_SESSION_ID || termProgram.includes("warp")) {
    return { name: "warp", supportsNewTab: true };
  }

  if (process.env.VSCODE_INJECTION || process.env.TERM_PROGRAM === "vscode") {
    return { name: "vscode", supportsNewTab: false };
  }

  if (process.env.KITTY_PID) {
    return { name: "kitty", supportsNewTab: true };
  }

  if (process.env.ALACRITTY_SOCKET) {
    return { name: "alacritty", supportsNewTab: false };
  }

  if (termProgram === "apple_terminal") {
    return { name: "apple-terminal", supportsNewTab: true };
  }

  if (termProgram === "hyper") {
    return { name: "hyper", supportsNewTab: false };
  }

  if (process.env.GNOME_TERMINAL_SCREEN) {
    return { name: "gnome-terminal", supportsNewTab: true };
  }

  if (process.env.KONSOLE_VERSION) {
    return { name: "konsole", supportsNewTab: true };
  }

  return { name: "unknown", supportsNewTab: false };
}

export async function openInTerminal(path: string): Promise<boolean> {
  const terminal = detectTerminal();
  const platform = process.platform;

  try {
    switch (terminal.name) {
      case "iterm":
        return await openInITerm(path);

      case "apple-terminal":
        return await openInAppleTerminal(path);

      case "warp":
        return await openInWarp(path);

      case "ghostty":
        return await openInGhostty(path);

      case "kitty":
        return await openInKitty(path);

      case "gnome-terminal":
        return await openInGnomeTerminal(path);

      case "konsole":
        return await openInKonsole(path);

      default:
        return await openInDefaultTerminal(path, platform);
    }
  } catch {
    return await openInDefaultTerminal(path, platform);
  }
}

async function openInITerm(path: string): Promise<boolean> {
  const script = `
    tell application "iTerm"
      tell current window
        create tab with default profile
        tell current session
          write text "cd ${escapePath(path)}"
        end tell
      end tell
    end tell
  `;
  const result = await $`osascript -e ${script}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInAppleTerminal(path: string): Promise<boolean> {
  const script = `
    tell application "Terminal"
      activate
      do script "cd ${escapePath(path)}"
    end tell
  `;
  const result = await $`osascript -e ${script}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInWarp(path: string): Promise<boolean> {
  const script = `
    tell application "Warp"
      activate
      tell application "System Events"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${escapePath(path)}"
        key code 36
      end tell
    end tell
  `;
  const result = await $`osascript -e ${script}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInGhostty(path: string): Promise<boolean> {
  const script = `
    tell application "Ghostty"
      activate
      tell application "System Events"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${escapePath(path)}"
        key code 36
      end tell
    end tell
  `;
  const result = await $`osascript -e ${script}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInKitty(path: string): Promise<boolean> {
  const result = await $`kitty @ launch --type=tab --cwd=${path}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInGnomeTerminal(path: string): Promise<boolean> {
  const result = await $`gnome-terminal --tab --working-directory=${path}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInKonsole(path: string): Promise<boolean> {
  const result = await $`konsole --new-tab --workdir ${path}`.nothrow().quiet();
  return result.exitCode === 0;
}

async function openInDefaultTerminal(path: string, platform: string): Promise<boolean> {
  if (platform === "darwin") {
    const result = await $`open -a Terminal ${path}`.nothrow().quiet();
    return result.exitCode === 0;
  }

  if (platform === "linux") {
    const result = await $`x-terminal-emulator --working-directory=${path}`.nothrow().quiet();
    if (result.exitCode === 0) return true;

    const xdgResult = await $`xdg-open ${path}`.nothrow().quiet();
    return xdgResult.exitCode === 0;
  }

  if (platform === "win32") {
    const result = await $`start cmd /K "cd /d ${path}"`.nothrow().quiet();
    return result.exitCode === 0;
  }

  return false;
}

function escapePath(path: string): string {
  return path.replace(/"/g, '\\"').replace(/\$/g, "\\$");
}
