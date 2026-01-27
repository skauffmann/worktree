import * as ui from "../components/ui.tsx";

/**
 * Handle user cancellation gracefully
 */
export function handleCancel(value: unknown): void {
  if (ui.isCancel(value)) {
    ui.cancel("Operation cancelled.");
    process.exit(0);
  }
}

/**
 * Wrapper for text prompt with cancellation handling
 */
export async function promptText(options: {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}): Promise<string> {
  const result = await ui.text(options);
  handleCancel(result);
  return result as string;
}

/**
 * Wrapper for confirm prompt with cancellation handling
 */
export async function promptConfirm(options: {
  message: string;
  initialValue?: boolean;
}): Promise<boolean> {
  const result = await ui.confirm(options);
  handleCancel(result);
  return result as boolean;
}

/**
 * Wrapper for select prompt with cancellation handling
 */
export async function promptSelect<T extends string>(options: {
  message: string;
  options: { value: T; label: string; hint?: string }[];
  initialValue?: T;
}): Promise<T> {
  const result = await ui.select(options);
  handleCancel(result);
  return result as T;
}

/**
 * Wrapper for multiselect prompt with cancellation handling
 */
export async function promptMultiselect<T>(options: {
  message: string;
  options: { value: T; label: string; hint?: string }[];
  initialValues?: T[];
  required?: boolean;
}): Promise<T[]> {
  const result = await ui.multiselect(options);
  handleCancel(result);
  return result as T[];
}

// Re-export UI utilities for direct use
export { ui };
