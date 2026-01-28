import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useWorktrees } from '../hooks/use-worktrees.ts';
import { useListNavigation } from '../hooks/use-list-navigation.ts';
import type { WorktreeInfo } from '../lib/git.ts';

export type BranchSelectionResult =
  | { type: 'existing'; worktree: WorktreeInfo }
  | { type: 'new'; branchName: string };

interface BranchSelectionProps {
  onSelect: (result: BranchSelectionResult) => void;
  onCancel?: () => void;
}

export function BranchSelection({ onSelect, onCancel }: BranchSelectionProps) {
  const worktreesState = useWorktrees();
  const [customValue, setCustomValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const worktrees = worktreesState.status === 'loaded' ? worktreesState.worktrees : [];
  const itemCount = worktrees.length + 1;

  const { selectedIndex } = useListNavigation({
    itemCount,
    initialIndex: 0,
    isActive: worktreesState.status === 'loaded',
    onSelect: (index) => {
      if (index > 0) {
        const wt = worktrees[index - 1];
        if (wt) {
          onSelect({ type: 'existing', worktree: wt });
        }
      }
    },
    onCancel,
  });

  const isCustomSelected = selectedIndex === 0;

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Branch name is required');
      return;
    }
    if (trimmed.includes(' ')) {
      setError('Branch name cannot contain spaces');
      return;
    }
    onSelect({ type: 'new', branchName: trimmed });
  };

  if (worktreesState.status === 'loading') {
    return (
      <Text>
        <Text color="cyan"><Spinner type="dots" /></Text> Loading worktrees...
      </Text>
    );
  }

  if (worktreesState.status === 'error') {
    return <Text color="red">Error: {worktreesState.message}</Text>;
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>Select a worktree or create a new one:</Text>
      </Box>

      <Box marginLeft={2}>
        <Text color={isCustomSelected ? 'cyan' : undefined}>
          {isCustomSelected ? '❯ ' : '  '}
        </Text>
        <TextInput
          value={customValue}
          onChange={(value) => {
            setCustomValue(value);
            setError(null);
          }}
          onSubmit={handleSubmit}
          placeholder="Enter new branch name..."
          focus={isCustomSelected}
        />
      </Box>
      {error && <Text color="red">    {error}</Text>}

      {worktrees.length > 0 && (
        <>
          <Text dimColor>    ─── or select existing ───</Text>
          {worktrees.map((wt, index) => {
            const label = wt.branch || wt.path;
            const isSelected = index + 1 === selectedIndex;
            const statusParts: string[] = [];
            if (wt.ahead > 0) statusParts.push(`↑${wt.ahead}`);
            if (wt.behind > 0) statusParts.push(`↓${wt.behind}`);
            const statusText = statusParts.length > 0 ? ` [${statusParts.join(' ')}]` : '';
            return (
              <Box key={wt.path} marginLeft={2}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '❯ ' : '  '}
                  {label}
                </Text>
                {statusText && <Text color="yellow">{statusText}</Text>}
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
}
