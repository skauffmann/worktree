import React, { useEffect, useRef } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useBranchCheck } from '../hooks/use-branch-check.ts';
import { useConfirm } from '../hooks/use-confirm.ts';
import type { RemoteBranchRef } from '../lib/git.ts';

export type BranchAction = 'create' | 'track' | 'use-existing';

export interface BranchCheckResult {
  action: BranchAction;
  remoteRef?: RemoteBranchRef;
}

interface BranchCheckProps {
  branchName: string;
  onResult: (result: BranchCheckResult) => void;
  onCancel?: () => void;
}

export function BranchCheck({ branchName, onResult, onCancel }: BranchCheckProps) {
  const branchStatus = useBranchCheck(branchName);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (hasCalledRef.current) return;

    if (branchStatus.status === 'not-found') {
      hasCalledRef.current = true;
      onResult({ action: 'create' });
    } else if (branchStatus.status === 'local') {
      hasCalledRef.current = true;
      onResult({ action: 'use-existing' });
    } else if (branchStatus.status === 'remote-ref') {
      hasCalledRef.current = true;
      onResult({ action: 'track', remoteRef: branchStatus.remoteRef });
    }
  }, [branchStatus, onResult]);

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
        onResult={(action) => onResult({ action })}
        onCancel={onCancel}
      />
    );
  }

  if (branchStatus.status === 'remote-ref') {
    return (
      <Text>
        <Text color="cyan"><Spinner type="dots" /></Text> Tracking remote branch "{branchStatus.remoteRef.branch}" from {branchStatus.remoteRef.remote}...
      </Text>
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
