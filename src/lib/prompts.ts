import * as p from "@clack/prompts";

/**
 * Handle user cancellation gracefully
 */
export function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
}

/**
 * Wrapper for text prompt with cancellation handling
 */
export async function promptText(
  options: Parameters<typeof p.text>[0]
): Promise<string> {
  const result = await p.text(options);
  handleCancel(result);
  return result as string;
}

/**
 * Wrapper for confirm prompt with cancellation handling
 */
export async function promptConfirm(
  options: Parameters<typeof p.confirm>[0]
): Promise<boolean> {
  const result = await p.confirm(options);
  handleCancel(result);
  return result as boolean;
}

/**
 * Wrapper for select prompt with cancellation handling
 */
export async function promptSelect<T extends string>(
  options: Parameters<typeof p.select>[0]
): Promise<T> {
  const result = await p.select(options);
  handleCancel(result);
  return result as T;
}
