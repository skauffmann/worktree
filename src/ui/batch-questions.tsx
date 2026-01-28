import React from 'react';
import { Box, Text } from 'ink';
import {
  useBatchQuestions,
  type Question,
  type Answers,
} from '../hooks/use-batch-questions.ts';

interface BatchQuestionsProps {
  title?: string;
  questions: Question[];
  initialValues: Answers;
  onConfirm: (answers: Answers) => void;
  onCancel?: () => void;
}

export function BatchQuestions({
  title = 'Configuration',
  questions,
  initialValues,
  onConfirm,
  onCancel,
}: BatchQuestionsProps) {
  const { focusedIndex, answers } = useBatchQuestions({
    questions,
    initialValues,
    onConfirm,
    onCancel,
  });

  const focusedQuestion = questions[focusedIndex];
  const focusedHint = focusedQuestion?.hint;

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
      >
        <Text bold color="cyan">
          {title}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {questions.map((question, index) => {
            const isFocused = index === focusedIndex;
            const value = answers[question.id];

            return (
              <Box key={question.id}>
                <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                  {isFocused ? '❯ ' : '  '}
                </Text>
                <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                  {question.label}:
                </Text>
                <Text> </Text>
                {question.type === 'boolean' ? (
                  <BooleanValue value={value as boolean} isFocused={isFocused} />
                ) : (
                  <SelectValue
                    value={value as string}
                    options={question.options || []}
                    isFocused={isFocused}
                  />
                )}
              </Box>
            );
          })}
        </Box>
        {focusedHint && (
          <Box marginTop={1}>
            <Text dimColor>  {focusedHint}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate  ←→ change  Enter confirm  Esc cancel</Text>
      </Box>
    </Box>
  );
}

interface BooleanValueProps {
  value: boolean;
  isFocused: boolean;
}

function BooleanValue({ value, isFocused }: BooleanValueProps) {
  return (
    <Text>
      {value ? (
        <>
          <Text color={isFocused ? 'cyan' : 'green'}>[Yes]</Text>
          <Text dimColor> / No</Text>
        </>
      ) : (
        <>
          <Text dimColor>Yes / </Text>
          <Text color={isFocused ? 'cyan' : 'red'}>[No]</Text>
        </>
      )}
    </Text>
  );
}

interface SelectValueProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  isFocused: boolean;
}

function SelectValue({ value, options, isFocused }: SelectValueProps) {
  return (
    <Text>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <Text key={option.value}>
            {index > 0 && <Text dimColor> / </Text>}
            {isSelected ? (
              <Text color={isFocused ? 'cyan' : 'green'}>[{option.label}]</Text>
            ) : (
              <Text dimColor>{option.label}</Text>
            )}
          </Text>
        );
      })}
    </Text>
  );
}

export type { Question, Answers };
