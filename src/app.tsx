import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { join } from 'node:path';
import {
  BranchSelection,
  type BranchSelectionResult,
} from './ui/branch-selection.tsx';
import {
  WorktreeActions,
  type WorktreeAction,
} from './ui/worktree-actions.tsx';
import { BranchCheck, type BranchCheckResult } from './ui/branch-check.tsx';
import { parseRemoteBranch } from './lib/git.ts';
import { Operations, type Operation } from './ui/operations.tsx';
import { Version } from './ui/version.tsx';
import {
  BatchQuestions,
  type Question,
  type Answers,
} from './ui/batch-questions.tsx';
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

interface BatchConfigData {
  questions: Question[];
  initialValues: Answers;
  envFiles: string[];
  generatedFiles: string[];
  projectCount: number;
  showBaseBranch: boolean;
}

type Step =
  | { type: 'loading' }
  | { type: 'not-git-repo' }
  | { type: 'select-worktree' }
  | { type: 'worktree-actions'; worktree: WorktreeInfo }
  | { type: 'branch-check'; branchName: string }
  | { type: 'batch-config'; data: BatchConfigData }
  | { type: 'operations' }
  | { type: 'done'; message: string }
  | { type: 'cancelled' };

interface Context {
  repoName: string;
  mainRepoPath: string;
  branchName: string | null;
  worktreePath: string | null;
  createNewBranch: boolean;
  baseBranch: string | null;
  branchExistsOnRemote: boolean;
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
    branchExistsOnRemote: false,
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

interface AppProps {
  initialBranchName?: string | null;
}

export function App({ initialBranchName }: AppProps) {
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
      const preferredTerminal = savedConfig?.terminal || null;

      setCtx((prev) => ({
        ...prev,
        repoName,
        mainRepoPath,
        savedConfig,
        preferredTerminal,
      }));

      if (initialBranchName) {
        const worktreePath = join(
          mainRepoPath,
          '..',
          `${repoName}-${initialBranchName.replace(/\//g, '-')}`
        );
        setCtx((prev) => ({
          ...prev,
          branchName: initialBranchName,
          worktreePath,
        }));
        setStep({ type: 'branch-check', branchName: initialBranchName });
      } else {
        setStep({ type: 'select-worktree' });
      }
    }
    init();
  }, [initialBranchName]);

  useEffect(() => {
    if (
      step.type === 'not-git-repo' ||
      step.type === 'cancelled' ||
      step.type === 'done'
    ) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [step.type, exit]);

  const handleCancel = () => setStep({ type: 'cancelled' });

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
      await buildBatchQuestions();
    }
  };

  const handleBranchCheck = async (result: BranchCheckResult) => {
    const { action, remoteRef } = result;

    if (action === 'use-existing') {
      setCtx((prev) => ({ ...prev, createNewBranch: false }));
    } else if (action === 'track') {
      if (remoteRef) {
        setCtx((prev) => ({
          ...prev,
          branchName: remoteRef.branch,
          worktreePath: join(
            prev.mainRepoPath,
            '..',
            `${prev.repoName}-${remoteRef.branch.replace(/\//g, '-')}`
          ),
          createNewBranch: true,
          baseBranch: `${remoteRef.remote}/${remoteRef.branch}`,
        }));
      } else if (ctx.branchName) {
        setCtx((prev) => ({
          ...prev,
          createNewBranch: true,
          baseBranch: `origin/${prev.branchName}`,
        }));
      }
    } else if (action === 'remote-exists') {
      setCtx((prev) => ({
        ...prev,
        branchExistsOnRemote: true,
        createNewBranch: true,
      }));
      await buildBatchQuestions({ branchExistsOnRemote: true });
      return;
    } else {
      setCtx((prev) => ({ ...prev, createNewBranch: true }));
    }

    await buildBatchQuestions();
  };

  const buildBatchQuestions = async (options?: { branchExistsOnRemote?: boolean }) => {
    const [
      envFiles,
      generatedFiles,
      structure,
      currentBranch,
      defaultBranch,
      packageManager,
      editor,
      terminal,
    ] = await Promise.all([
      findEnvFiles(ctx.mainRepoPath),
      findGeneratedFiles(ctx.mainRepoPath),
      detectRepoStructure(ctx.mainRepoPath),
      getCurrentBranch(),
      getDefaultBranch(),
      detectPackageManager(ctx.mainRepoPath),
      detectEditor(),
      detectTerminal(),
    ]);

    let showBaseBranch = false;
    if (currentBranch && defaultBranch && currentBranch === defaultBranch) {
      const originStatus = await isOriginAhead(defaultBranch);
      showBaseBranch = originStatus.exists;
    }

    const repoConfig = getRepoConfig(ctx.savedConfig, ctx.repoName);
    const savedDefaults = repoConfig?.defaultValues;
    const hasSavedConfig =
      savedDefaults &&
      Object.values(savedDefaults).some((v) => v !== undefined);

    const questions: Question[] = [];
    const initialValues: Answers = {};

    if (options?.branchExistsOnRemote) {
      questions.push({
        id: 'trackRemote',
        label: `Track remote branch "${ctx.branchName}"`,
        type: 'boolean',
      });
      initialValues.trackRemote = true;
    }

    if (showBaseBranch) {
      questions.push({
        id: 'useOriginMain',
        label: `From origin/${defaultBranch}`,
        type: 'boolean',
      });
      initialValues.useOriginMain = true;
    }

    if (envFiles.length > 0) {
      questions.push({
        id: 'envAction',
        label: 'Env files',
        type: 'select',
        options: [
          { value: 'symlink', label: 'Symlink' },
          { value: 'copy', label: 'Copy' },
          { value: 'nothing', label: 'Nothing' },
        ],
        hint: `files: ${envFiles.join(', ')}`,
      });
      initialValues.envAction = savedDefaults?.dotEnvAction || 'symlink';
    }

    if (generatedFiles.length > 0) {
      questions.push({
        id: 'copyGenerated',
        label: 'Generated files',
        type: 'select',
        options: [
          { value: 'copy', label: 'Copy' },
          { value: 'nothing', label: 'Nothing' },
        ],
        hint: `files: ${generatedFiles.join(', ')}`,
      });
      initialValues.copyGenerated = savedDefaults?.copyGeneratedFiles
        ? 'copy'
        : 'copy';
    }

    if (structure.projects.length > 0) {
      questions.push({
        id: 'installDeps',
        label: `Install deps (${packageManager})`,
        type: 'boolean',
        hint:
          'projects: ' +
          structure.projects.map((p) => p.relativePath).join(', '),
      });
      initialValues.installDeps = savedDefaults?.installDependencies ?? true;
    }

    questions.push({
      id: 'openEditor',
      label: editor ? `Open in editor (${editor})` : 'Open in editor',
      type: 'boolean',
      hint: 'update your favorite editor in the ~/.worktree.json file',
    });
    initialValues.openEditor = savedDefaults?.openInEditor ?? true;

    const terminalName = terminal.name !== 'unknown' ? terminal.name : null;
    questions.push({
      id: 'openTerminal',
      label: terminalName
        ? `Open in terminal (${terminalName})`
        : 'Open in terminal',
      type: 'boolean',
      hint: 'update your favorite terminal in the ~/.worktree.json file',
    });
    initialValues.openTerminal = savedDefaults?.openInTerminal ?? true;

    questions.push({
      id: 'saveConfig',
      label: hasSavedConfig ? 'Update config' : 'Save config',
      type: 'boolean',
      hint: 'The configuration will be saved in the ~/.worktree.json file',
    });
    initialValues.saveConfig = true;

    const batchData: BatchConfigData = {
      questions,
      initialValues,
      envFiles,
      generatedFiles,
      projectCount: structure.projects.length,
      showBaseBranch,
    };

    setStep({ type: 'batch-config', data: batchData });
  };

  const handleBatchConfig = async (answers: Answers) => {
    const batchData = step.type === 'batch-config' ? step.data : null;
    if (!batchData) return;

    if (answers.trackRemote && ctx.branchExistsOnRemote) {
      setCtx((prev) => ({
        ...prev,
        baseBranch: `origin/${prev.branchName}`,
      }));
    }

    if (answers.useOriginMain) {
      const defaultBranch = await getDefaultBranch();
      setCtx((prev) => ({ ...prev, baseBranch: `origin/${defaultBranch}` }));
    }

    const envAction = (answers.envAction as EnvAction) || 'nothing';
    const copyGenerated = answers.copyGenerated === 'copy';
    const installDeps = (answers.installDeps as boolean) ?? false;
    const openEditor = answers.openEditor as boolean;
    const openTerminal = answers.openTerminal as boolean;
    const saveConfig = answers.saveConfig as boolean;

    setCtx((prev) => ({
      ...prev,
      envAction,
      envFiles: envAction !== 'nothing' ? batchData.envFiles : [],
      shouldCopyGeneratedFiles: copyGenerated,
      generatedFiles: copyGenerated ? batchData.generatedFiles : [],
      shouldInstallDeps: installDeps,
      shouldOpenEditor: openEditor,
      shouldOpenTerminal: openTerminal,
    }));

    if (saveConfig) {
      const defaults: DefaultValues = {
        dotEnvAction: envAction,
        copyGeneratedFiles: copyGenerated,
        installDependencies: installDeps,
        openInEditor: openEditor,
        openInTerminal: openTerminal,
      };
      await saveRepoConfig(ctx.repoName, defaults);
    }

    setStep({ type: 'operations' });
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
          return {
            success: result.success,
            message: result.error || 'Worktree removed',
          };
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
          return {
            success: true,
            message: result.success ? 'Done' : 'Skipped',
          };
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
          return {
            success: result.success,
            message: result.error || 'Created',
          };
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
              await symlinkEnvFiles(
                ctx.mainRepoPath,
                worktreePath,
                ctx.envFiles
              );
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
            await copyGeneratedFiles(
              ctx.mainRepoPath,
              worktreePath,
              ctx.generatedFiles
            );
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
          const result = await $`cd ${worktreePath} && ${pm} install`
            .nothrow()
            .quiet();
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
          const success = await openInTerminal(
            worktreePath,
            `${ctx.repoName}: ${ctx.branchName}`
          );
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
      setStep({
        type: 'done',
        message: `Worktree ready at: ${ctx.worktreePath}`,
      });
    }
  };

  const renderHeader = () => (
    <>
      <Text>
        <Text bold>Git Worktree Manager</Text> <Version />
      </Text>
      {ctx.repoName && <Text dimColor>Repository: {ctx.repoName}</Text>}
      <Text> </Text>
    </>
  );

  if (step.type === 'loading') {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>{' '}
          Initializing...
        </Text>
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

      {step.type === 'select-worktree' && (
        <BranchSelection
          onSelect={handleWorktreeSelect}
          onCancel={handleCancel}
        />
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

      {step.type === 'batch-config' && (
        <BatchQuestions
          title={`Configuration for ${ctx.branchName}`}
          questions={step.data.questions}
          initialValues={step.data.initialValues}
          onConfirm={handleBatchConfig}
          onCancel={handleCancel}
        />
      )}

      {step.type === 'operations' && (
        <Operations
          operations={buildOperations()}
          onComplete={handleOperationsComplete}
        />
      )}
    </Box>
  );
}
