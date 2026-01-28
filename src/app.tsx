import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { BranchSelection, type BranchSelectionResult } from './ui/branch-selection.tsx';
import { WorktreeActions, type WorktreeAction } from './ui/worktree-actions.tsx';
import { BranchCheck, type BranchAction } from './ui/branch-check.tsx';
import { Confirm } from './ui/confirm.tsx';
import { Select } from './ui/select.tsx';
import { Operations, type Operation } from './ui/operations.tsx';
import { Version } from './ui/version.tsx';
import { ConfigSummary } from './ui/config-summary.tsx';
import { SaveConfig } from './ui/save-config.tsx';
import {
  isInsideGitRepo,
  getRepoName,
  getMainRepoPath,
  createWorktree,
  removeWorktree,
  gitFetch,
  getCurrentBranch,
  getDefaultBranch,
  isOriginAhead,
  type WorktreeInfo,
} from './lib/git.ts';
import {
  findEnvFiles,
  findGeneratedFiles,
  symlinkEnvFiles,
  copyEnvFiles,
  copyGeneratedFiles,
  detectRepoStructure,
  detectPackageManager,
} from './lib/files.ts';
import { detectEditor, openInEditor } from './lib/editor.ts';
import { detectTerminal, openInTerminal } from './lib/terminal.ts';
import {
  loadConfig,
  getRepoConfig,
  saveRepoConfig,
  type Config,
  type DefaultValues,
} from './lib/config.ts';
import { $ } from 'bun';

type EnvAction = 'symlink' | 'copy' | 'nothing';

type Step =
  | { type: 'loading' }
  | { type: 'not-git-repo' }
  | { type: 'config-summary'; defaults: DefaultValues }
  | { type: 'select-worktree' }
  | { type: 'worktree-actions'; worktree: WorktreeInfo }
  | { type: 'branch-check'; branchName: string }
  | { type: 'base-branch' }
  | { type: 'env-files'; files: string[] }
  | { type: 'generated-files'; files: string[] }
  | { type: 'install-deps'; projectCount: number }
  | { type: 'open-editor' }
  | { type: 'open-terminal' }
  | { type: 'operations' }
  | { type: 'save-config' }
  | { type: 'done'; message: string }
  | { type: 'cancelled' };

interface Context {
  repoName: string;
  mainRepoPath: string;
  branchName: string | null;
  worktreePath: string | null;
  createNewBranch: boolean;
  baseBranch: string | null;
  envFiles: string[];
  envAction: EnvAction;
  generatedFiles: string[];
  shouldCopyGeneratedFiles: boolean;
  shouldInstallDeps: boolean;
  shouldOpenEditor: boolean;
  shouldOpenTerminal: boolean;
  actionOnExisting: WorktreeAction | null;
  savedConfig: Config | null;
  usingDefaults: boolean;
  preferredTerminal: string | null;
}

function createInitialContext(): Context {
  return {
    repoName: '',
    mainRepoPath: '',
    branchName: null,
    worktreePath: null,
    createNewBranch: true,
    baseBranch: null,
    envFiles: [],
    envAction: 'nothing',
    generatedFiles: [],
    shouldCopyGeneratedFiles: false,
    shouldInstallDeps: true,
    shouldOpenEditor: true,
    shouldOpenTerminal: true,
    actionOnExisting: null,
    savedConfig: null,
    usingDefaults: false,
    preferredTerminal: null,
  };
}

export function App() {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>({ type: 'loading' });
  const [ctx, setCtx] = useState<Context>(createInitialContext);

  useEffect(() => {
    async function init() {
      const isGitRepo = await isInsideGitRepo();
      if (!isGitRepo) {
        setStep({ type: 'not-git-repo' });
        return;
      }
      const [repoName, mainRepoPath, configResult] = await Promise.all([
        getRepoName(),
        getMainRepoPath(),
        loadConfig(),
      ]);

      const savedConfig = configResult.success ? configResult.config : null;
      const repoConfig = getRepoConfig(savedConfig, repoName);
      const preferredTerminal = savedConfig?.terminal || null;

      setCtx((prev) => ({
        ...prev,
        repoName,
        mainRepoPath,
        savedConfig,
        preferredTerminal,
      }));

      setStep({ type: 'select-worktree' });
    }
    init();
  }, []);

  useEffect(() => {
    if (step.type === 'not-git-repo' || step.type === 'cancelled' || step.type === 'done') {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step.type, exit]);

  const handleCancel = () => setStep({ type: 'cancelled' });

  const handleConfigSummary = async (useDefaults: boolean) => {
    if (useDefaults && step.type === 'config-summary') {
      const defaults = step.defaults;
      setCtx((prev) => ({
        ...prev,
        usingDefaults: true,
        envAction: defaults.dotEnvAction || prev.envAction,
        shouldCopyGeneratedFiles: defaults.copyGeneratedFiles ?? false,
        shouldInstallDeps: defaults.installDependencies ?? prev.shouldInstallDeps,
        shouldOpenEditor: defaults.openInEditor ?? prev.shouldOpenEditor,
        shouldOpenTerminal: defaults.openInTerminal ?? prev.shouldOpenTerminal,
      }));
      await prepareFilesAndProceed();
    } else {
      await checkEnvFiles();
    }
  };

  const handleWorktreeSelect = (result: BranchSelectionResult) => {
    if (result.type === 'existing') {
      setCtx((prev) => ({
        ...prev,
        branchName: result.worktree.branch,
        worktreePath: result.worktree.path,
      }));
      setStep({ type: 'worktree-actions', worktree: result.worktree });
    } else {
      const worktreePath = join(
        ctx.mainRepoPath,
        '..',
        `${ctx.repoName}-${result.branchName.replace(/\//g, '-')}`
      );
      setCtx((prev) => ({
        ...prev,
        branchName: result.branchName,
        worktreePath,
      }));
      setStep({ type: 'branch-check', branchName: result.branchName });
    }
  };

  const handleWorktreeAction = async (action: WorktreeAction) => {
    if (action === 'cancel') {
      setStep({ type: 'cancelled' });
      return;
    }

    setCtx((prev) => ({ ...prev, actionOnExisting: action }));

    if (action === 'open') {
      setCtx((prev) => ({
        ...prev,
        shouldInstallDeps: false,
        shouldOpenTerminal: false,
      }));
      setStep({ type: 'operations' });
    } else if (action === 'delete') {
      setCtx((prev) => ({
        ...prev,
        shouldOpenEditor: false,
        shouldOpenTerminal: false,
        shouldInstallDeps: false,
      }));
      setStep({ type: 'operations' });
    } else if (action === 'replace') {
      await checkConfigOrEnvFiles();
    }
  };

  const handleBranchCheck = async (action: BranchAction) => {
    if (action === 'use-existing') {
      setCtx((prev) => ({ ...prev, createNewBranch: false }));
    } else if (action === 'track') {
      setCtx((prev) => ({ ...prev, createNewBranch: false }));
    } else {
      setCtx((prev) => ({ ...prev, createNewBranch: true }));
    }

    const currentBranch = await getCurrentBranch();
    const defaultBranch = await getDefaultBranch();

    if (currentBranch && defaultBranch && currentBranch === defaultBranch) {
      const originStatus = await isOriginAhead(defaultBranch);
      if (originStatus.exists) {
        setStep({ type: 'base-branch' });
        return;
      }
    }

    await checkConfigOrEnvFiles();
  };

  const handleBaseBranch = async (useOrigin: boolean) => {
    if (useOrigin) {
      const defaultBranch = await getDefaultBranch();
      setCtx((prev) => ({ ...prev, baseBranch: `origin/${defaultBranch}` }));
    }
    await checkConfigOrEnvFiles();
  };

  const checkConfigOrEnvFiles = async () => {
    const repoConfig = getRepoConfig(ctx.savedConfig, ctx.repoName);
    if (repoConfig?.defaultValues) {
      const defaults = repoConfig.defaultValues;
      const hasAnyValue = Object.values(defaults).some((v) => v !== undefined);
      if (hasAnyValue) {
        setStep({ type: 'config-summary', defaults });
        return;
      }
    }
    await checkEnvFiles();
  };

  const checkEnvFiles = async () => {
    const files = await findEnvFiles(ctx.mainRepoPath);
    if (files.length > 0) {
      setStep({ type: 'env-files', files });
    } else {
      await checkGeneratedFiles();
    }
  };

  const prepareFilesAndProceed = async () => {
    const [envFiles, generatedFiles] = await Promise.all([
      findEnvFiles(ctx.mainRepoPath),
      findGeneratedFiles(ctx.mainRepoPath),
    ]);

    setCtx((prev) => ({
      ...prev,
      envFiles: prev.envAction !== 'nothing' ? envFiles : [],
      generatedFiles: prev.shouldCopyGeneratedFiles ? generatedFiles : [],
    }));

    setStep({ type: 'operations' });
  };

  const handleEnvAction = async (action: EnvAction) => {
    const files = step.type === 'env-files' ? step.files : [];
    setCtx((prev) => ({ ...prev, envFiles: files, envAction: action }));
    await checkGeneratedFiles();
  };

  const checkGeneratedFiles = async () => {
    const files = await findGeneratedFiles(ctx.mainRepoPath);
    if (files.length > 0) {
      setStep({ type: 'generated-files', files });
    } else {
      await checkInstallDeps();
    }
  };

  const handleGeneratedFiles = async (copy: boolean) => {
    const files = step.type === 'generated-files' && copy ? step.files : [];
    setCtx((prev) => ({ ...prev, generatedFiles: files }));
    await checkInstallDeps();
  };

  const checkInstallDeps = async () => {
    const structure = await detectRepoStructure(ctx.mainRepoPath);
    if (structure.projects.length > 0) {
      setStep({ type: 'install-deps', projectCount: structure.projects.length });
    } else {
      setStep({ type: 'open-editor' });
    }
  };

  const handleInstallDeps = (value: boolean) => {
    setCtx((prev) => ({ ...prev, shouldInstallDeps: value }));
    setStep({ type: 'open-editor' });
  };

  const handleOpenEditor = (value: boolean) => {
    setCtx((prev) => ({ ...prev, shouldOpenEditor: value }));
    setStep({ type: 'open-terminal' });
  };

  const handleOpenTerminal = (value: boolean) => {
    setCtx((prev) => ({ ...prev, shouldOpenTerminal: value }));
    setStep({ type: 'save-config' });
  };

  const buildOperations = (): Operation[] => {
    const ops: Operation[] = [];
    const worktreePath = ctx.worktreePath || '';

    if (ctx.actionOnExisting === 'delete') {
      ops.push({
        id: 'delete',
        label: 'Removing worktree',
        run: async () => {
          const result = await removeWorktree(worktreePath);
          return { success: result.success, message: result.error || 'Worktree removed' };
        },
      });
      return ops;
    }

    if (ctx.actionOnExisting === 'open') {
      ops.push({
        id: 'open',
        label: 'Opening in editor',
        run: async () => {
          const editor = await detectEditor();
          if (editor) {
            await openInEditor(editor, worktreePath);
            return { success: true, message: 'Opened' };
          }
          return { success: false, message: 'No editor found' };
        },
      });
      return ops;
    }

    if (ctx.actionOnExisting === 'replace') {
      ops.push({
        id: 'remove',
        label: 'Removing existing worktree',
        run: async () => {
          const result = await removeWorktree(worktreePath);
          return { success: result.success, message: result.error };
        },
      });
    }

    if (ctx.branchName && !ctx.actionOnExisting) {
      ops.push({
        id: 'fetch',
        label: 'Fetching from origin',
        run: async () => {
          const result = await gitFetch();
          return { success: true, message: result.success ? 'Done' : 'Skipped' };
        },
      });
    }

    if (ctx.branchName) {
      ops.push({
        id: 'create',
        label: 'Creating worktree',
        run: async () => {
          const result = await createWorktree(
            worktreePath,
            ctx.branchName!,
            ctx.createNewBranch,
            ctx.baseBranch || undefined
          );
          return { success: result.success, message: result.error || 'Created' };
        },
      });
    }

    if (ctx.envAction !== 'nothing' && ctx.envFiles.length > 0) {
      ops.push({
        id: 'env',
        label: `${ctx.envAction === 'symlink' ? 'Symlinking' : 'Copying'} env files`,
        run: async () => {
          try {
            if (ctx.envAction === 'symlink') {
              await symlinkEnvFiles(ctx.mainRepoPath, worktreePath, ctx.envFiles);
            } else {
              await copyEnvFiles(ctx.mainRepoPath, worktreePath, ctx.envFiles);
            }
            return { success: true, message: 'Done' };
          } catch (err) {
            return { success: false, message: String(err) };
          }
        },
      });
    }

    if (ctx.generatedFiles.length > 0) {
      ops.push({
        id: 'generated',
        label: 'Copying generated files',
        run: async () => {
          try {
            await copyGeneratedFiles(ctx.mainRepoPath, worktreePath, ctx.generatedFiles);
            return { success: true, message: 'Done' };
          } catch (err) {
            return { success: false, message: String(err) };
          }
        },
      });
    }

    if (ctx.shouldInstallDeps) {
      ops.push({
        id: 'deps',
        label: 'Installing dependencies',
        run: async () => {
          const pm = await detectPackageManager(ctx.mainRepoPath);
          const result = await $`cd ${worktreePath} && ${pm} install`.nothrow().quiet();
          return {
            success: result.exitCode === 0,
            message: result.exitCode === 0 ? `Installed with ${pm}` : 'Failed',
          };
        },
      });
    }

    if (ctx.shouldOpenEditor) {
      ops.push({
        id: 'editor',
        label: 'Opening in editor',
        run: async () => {
          const editor = await detectEditor();
          if (editor) {
            await openInEditor(editor, worktreePath);
            return { success: true, message: 'Opened' };
          }
          return { success: false, message: 'No editor found' };
        },
      });
    }

    if (ctx.shouldOpenTerminal) {
      ops.push({
        id: 'terminal',
        label: 'Opening terminal',
        run: async () => {
          const success = await openInTerminal(worktreePath, `${ctx.repoName}: ${ctx.branchName}`);
          return { success, message: success ? 'Opened' : 'Failed' };
        },
      });
    }

    return ops;
  };

  const handleOperationsComplete = (success: boolean, message: string) => {
    if (ctx.actionOnExisting === 'delete') {
      setStep({ type: 'done', message: 'Worktree deleted.' });
    } else {
      setStep({ type: 'done', message: `Worktree ready at: ${ctx.worktreePath}` });
    }
  };

  const handleSaveConfig = async (save: boolean) => {
    if (save) {
      const defaults: DefaultValues = {
        dotEnvAction: ctx.envAction,
        copyGeneratedFiles: ctx.generatedFiles.length > 0,
        installDependencies: ctx.shouldInstallDeps,
        openInEditor: ctx.shouldOpenEditor,
        openInTerminal: ctx.shouldOpenTerminal,
      };
      await saveRepoConfig(ctx.repoName, defaults);
    }
    setStep({ type: 'operations' });
  };

  const renderHeader = () => (
    <>
      <Text><Text bold>Git Worktree Manager</Text> <Version /></Text>
      {ctx.repoName && <Text dimColor>Repository: {ctx.repoName}</Text>}
      <Text> </Text>
    </>
  );

  if (step.type === 'loading') {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text><Text color="cyan"><Spinner type="dots" /></Text> Initializing...</Text>
      </Box>
    );
  }

  if (step.type === 'not-git-repo') {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text color="red">Not inside a git repository.</Text>
      </Box>
    );
  }

  if (step.type === 'cancelled') {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text color="yellow">Operation cancelled.</Text>
      </Box>
    );
  }

  if (step.type === 'done') {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text color="green">✓ {step.message}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {renderHeader()}

      {step.type === 'config-summary' && (
        <ConfigSummary
          repoName={ctx.repoName}
          defaults={step.defaults}
          onConfirm={handleConfigSummary}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'select-worktree' && (
        <BranchSelection onSelect={handleWorktreeSelect} onCancel={handleCancel} />
      )}

      {step.type === 'worktree-actions' && (
        <WorktreeActions
          worktree={step.worktree}
          onSelect={handleWorktreeAction}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'branch-check' && (
        <BranchCheck
          branchName={step.branchName}
          onResult={handleBranchCheck}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'base-branch' && (
        <Confirm
          message="Create from origin/main?"
          defaultValue={true}
          onConfirm={handleBaseBranch}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'env-files' && (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={1}
            marginBottom={1}
          >
            <Text bold color="cyan">Environment Files</Text>
            <Text>Found {step.files.length} env file(s): {step.files.join(', ')}</Text>
          </Box>
          <Select<EnvAction>
            message="How to handle .env files?"
            options={[
              { value: 'symlink', label: 'Symlink', hint: 'recommended - stays in sync' },
              { value: 'copy', label: 'Copy', hint: 'independent copies' },
              { value: 'nothing', label: 'Nothing', hint: 'skip env files' },
            ]}
            defaultValue="symlink"
            onSelect={handleEnvAction}
            onCancel={handleCancel}
          />
        </Box>
      )}

      {step.type === 'generated-files' && (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={1}
            marginBottom={1}
          >
            <Text bold color="cyan">Generated Files</Text>
            <Text>Found {step.files.length} file(s): {step.files.join(', ')}</Text>
          </Box>
          <Confirm
            message="Copy generated files to new worktree?"
            defaultValue={true}
            onConfirm={handleGeneratedFiles}
            onCancel={handleCancel}
          />
        </Box>
      )}

      {step.type === 'install-deps' && (
        <Confirm
          message={`Install dependencies? (${step.projectCount} project(s))`}
          defaultValue={true}
          onConfirm={handleInstallDeps}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'open-editor' && (
        <Confirm
          message="Open in editor after processing?"
          defaultValue={true}
          onConfirm={handleOpenEditor}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'open-terminal' && (
        <Confirm
          message="Open in a new terminal tab?"
          defaultValue={true}
          onConfirm={handleOpenTerminal}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'operations' && (
        <Operations
          operations={buildOperations()}
          onComplete={handleOperationsComplete}
        />
      )}

      {step.type === 'save-config' && (
        <SaveConfig
          defaults={{
            dotEnvAction: ctx.envAction,
            copyGeneratedFiles: ctx.generatedFiles.length > 0,
            installDependencies: ctx.shouldInstallDeps,
            openInEditor: ctx.shouldOpenEditor,
            openInTerminal: ctx.shouldOpenTerminal,
          }}
          onConfirm={handleSaveConfig}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}
