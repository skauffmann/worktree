import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useOperations, type Operation, type OperationStatus } from '../hooks/use-operations.ts';

export type { Operation };

interface OperationsProps {
  operations: Operation[];
  onComplete: (success: boolean, message: string) => void;
}

function StatusIcon({ status }: { status: OperationStatus }) {
  switch (status) {
    case 'pending':
      return <Text dimColor>○</Text>;
    case 'running':
      return <Text color="cyan"><Spinner type="dots" /></Text>;
    case 'success':
      return <Text color="green">✓</Text>;
    case 'warning':
      return <Text color="yellow">⚠</Text>;
    case 'error':
      return <Text color="red">✗</Text>;
  }
}

export function Operations({ operations, onComplete }: OperationsProps) {
  const { states } = useOperations(operations, onComplete);

  return (
    <Box flexDirection="column">
      {states.map((op) => (
        <Box key={op.id}>
          <StatusIcon status={op.status} />
          <Text> {op.label}</Text>
          {op.message && op.status !== 'running' && (
            <Text dimColor> - {op.message}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
