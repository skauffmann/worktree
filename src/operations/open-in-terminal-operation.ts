import { ui } from "../lib/prompts.ts";
import { detectTerminal, openInTerminal } from "../lib/terminal";

export async function openInTerminalOperation(path: string, title?: string): Promise<void> {
  const spinner = ui.spinner();
  const terminal = detectTerminal();

  spinner.start(`Opening in ${formatTerminalName(terminal.name)}...`);

  const success = await openInTerminal(path, title);

  if (!success) {
    spinner.stop("Failed to open terminal.");
    ui.note(
      "Could not open a new terminal tab automatically.",
      "Terminal not supported"
    );
    return;
  }

  spinner.stop("Opened in new terminal tab.");
}

function formatTerminalName(name: string): string {
  const names: Record<string, string> = {
    "apple-terminal": "Terminal",
    iterm: "iTerm",
    warp: "Warp",
    vscode: "VS Code",
    ghostty: "Ghostty",
    kitty: "Kitty",
    alacritty: "Alacritty",
    hyper: "Hyper",
    "gnome-terminal": "GNOME Terminal",
    konsole: "Konsole",
    "xfce4-terminal": "XFCE Terminal",
    unknown: "terminal",
  };
  return names[name] || "terminal";
}
