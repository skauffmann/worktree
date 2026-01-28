import React from 'react';
import { Text, Box } from 'ink';
import { useConfirm } from '../hooks/use-confirm.ts';

interface ConfirmProps {
  message: string;
  defaultValue?: boolean;
  onConfirm: (value: boolean) => void;
  onCancel?: () => void;
}

export function Confirm({ message, defaultValue = true, onConfirm, onCancel }: ConfirmProps) {
  const { value } = useConfirm({ defaultValue, onConfirm, onCancel });

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text bold>{message} </Text>
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
