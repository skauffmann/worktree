export type EnvFileAction = "symlink" | "copy" | "nothing";

export interface WorktreeConfig {
  branchName: string;
  worktreePath: string;
  installDependencies: boolean;
  envFileAction: EnvFileAction;
  openInEditor: boolean;
}
