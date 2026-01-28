import React, { useEffect, useRef } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useBranchCheck } from '../hooks/use-branch-check.ts';
import { useConfirm } from '../hooks/use-confirm.ts';

export type BranchAction = 'create' | 'track' | 'use-existing';

interface BranchCheckProps {
  branchName: string;
  onResult: (action: BranchAction) => void;
  onCancel?: () => void;
}

export function BranchCheck({ branchName, onResult, onCancel }: BranchCheckProps) {
  const branchStatus = useBranchCheck(branchName);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (hasCalledRef.current) return;

    if (branchStatus.status === 'not-found') {
      hasCalledRef.current = true;
      onResult('create');
    } else if (branchStatus.status === 'local') {
      hasCalledRef.current = true;
      onResult('use-existing');
    }
  }, [branchStatus.status, onResult]);

  if (branchStatus.status === 'checking') {
    return (
      <Text>
        <Text color="cyan"><Spinner type="dots" /></Text> Checking branch "{branchName}"...
      </Text>
    );
  }

  if (branchStatus.status === 'local') {
    return (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
        >
          <Text bold color="yellow">Branch Found</Text>
          <Text>Branch "{branchName}" already exists locally.</Text>
        </Box>
      </Box>
    );
  }

  if (branchStatus.status === 'remote') {
    return (
      <RemoteConfirm
        branchName={branchName}
        onResult={onResult}
        onCancel={onCancel}
      />
    );
  }

  return null;
}

interface RemoteConfirmProps {
  branchName: string;
  onResult: (action: BranchAction) => void;
  onCancel?: () => void;
}

function RemoteConfirm({ branchName, onResult, onCancel }: RemoteConfirmProps) {
  const { value } = useConfirm({
    defaultValue: true,
    onConfirm: (confirmed) => onResult(confirmed ? 'track' : 'create'),
    onCancel,
  });

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text bold>Branch "{branchName}" exists on remote. Track it? </Text>
      <Text dimColor>
        {value ? (
          <>
            <Text color="green" underline>Yes</Text> / No
          </>
        ) : (
          <>
            Yes / <Text color="red" underline>No</Text>
          </>
        )}
      </Text>
    </Box>
  );
}
