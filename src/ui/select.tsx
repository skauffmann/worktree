import React from 'react';
import { Text, Box } from 'ink';
import { useListNavigation } from '../hooks/use-list-navigation.ts';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectProps<T extends string = string> {
  message: string;
  options: SelectOption<T>[];
  defaultValue?: T;
  onSelect: (value: T) => void;
  onCancel?: () => void;
}

export function Select<T extends string = string>({
  message,
  options,
  defaultValue,
  onSelect,
  onCancel,
}: SelectProps<T>) {
  const initialIndex = defaultValue
    ? Math.max(0, options.findIndex((opt) => opt.value === defaultValue))
    : 0;

  const { selectedIndex } = useListNavigation({
    itemCount: options.length,
    initialIndex,
    onSelect: (index) => {
      const option = options[index];
      if (option) {
        onSelect(option.value);
      }
    },
    onCancel,
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>{message}</Text>
      </Box>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={option.value} marginLeft={2}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '❯ ' : '  '}
              {option.label}
            </Text>
            {option.hint && <Text dimColor> ({option.hint})</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
