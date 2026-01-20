import { findEnvFiles } from "../lib/files";
import { promptSelect } from "../lib/prompts";
import * as p from "@clack/prompts";

export type EnvFileAction = "symlink" | "copy" | "nothing";

export interface EnvFileActionResult {
  envFiles: string[];
  action: EnvFileAction;
}

export async function promptDotEnvFiles(path: string): Promise<EnvFileActionResult> {
  const envFiles = await findEnvFiles(path);
  if (envFiles.length > 0) {
    p.note(
      `Found ${envFiles.length} env file(s): ${envFiles.join(", ")}`,
      "Environment Files"
    );

    const action = await promptSelect<EnvFileAction>({
      message: "How to handle .env files?",
      initialValue: "symlink",
      options: [
        {
          value: "symlink",
          label: "Symlink",
          hint: "recommended - stays in sync",
        },
        { value: "copy", label: "Copy", hint: "independent copies" },
        { value: "nothing", label: "Nothing", hint: "skip env files" },
      ],
    });
    return { envFiles, action };
  }
  return { envFiles: [], action: "nothing" };
}
