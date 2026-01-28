import React from 'react';
import { Text, Box } from 'ink';
import { useListNavigation } from '../hooks/use-list-navigation.ts';
import type { WorktreeInfo } from '../lib/git.ts';

export type WorktreeAction = 'open' | 'delete' | 'replace' | 'cancel';

interface WorktreeActionsProps {
  worktree: WorktreeInfo;
  onSelect: (action: WorktreeAction) => void;
  onCancel?: () => void;
}

const OPTIONS: Array<{ value: WorktreeAction; label: string; hint: string }> = [
  { value: 'open', label: 'Open', hint: 'open in editor' },
  { value: 'delete', label: 'Delete', hint: 'remove worktree' },
  { value: 'replace', label: 'Replace', hint: 'delete and recreate' },
  { value: 'cancel', label: 'Cancel', hint: 'abort operation' },
];

export function WorktreeActions({ worktree, onSelect, onCancel }: WorktreeActionsProps) {
  const { selectedIndex } = useListNavigation({
    itemCount: OPTIONS.length,
    onSelect: (index) => {
      const option = OPTIONS[index];
      if (option) {
        onSelect(option.value);
      }
    },
    onCancel,
  });

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">Selected Worktree</Text>
        <Text>Path: {worktree.path}</Text>
        <Text>Branch: {worktree.branch || 'detached'}</Text>
      </Box>

      <Box>
        <Text color="cyan">? </Text>
        <Text bold>What would you like to do?</Text>
      </Box>

      {OPTIONS.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={option.value} marginLeft={2}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '❯ ' : '  '}
              {option.label}
            </Text>
            <Text dimColor> ({option.hint})</Text>
          </Box>
        );
      })}
    </Box>
  );
}
