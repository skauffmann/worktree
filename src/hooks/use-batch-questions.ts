import { useState, useCallback } from 'react';
import { useInput } from 'ink';

export interface Question {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  options?: Array<{ value: string; label: string }>;
  hint?: string;
}

export type AnswerValue = boolean | string;
export type Answers = Record<string, AnswerValue>;

interface UseBatchQuestionsOptions {
  questions: Question[];
  initialValues: Answers;
  onConfirm: (answers: Answers) => void;
  onCancel?: () => void;
  isActive?: boolean;
}

export function useBatchQuestions({
  questions,
  initialValues,
  onConfirm,
  onCancel,
  isActive = true,
}: UseBatchQuestionsOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialValues);

  const moveFocus = useCallback(
    (delta: number) => {
      setFocusedIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return questions.length - 1;
        if (next >= questions.length) return 0;
        return next;
      });
    },
    [questions.length]
  );

  const changeValue = useCallback(
    (delta: number) => {
      const question = questions[focusedIndex];
      if (!question) return;

      setAnswers((prev) => {
        const currentValue = prev[question.id];

        if (question.type === 'boolean') {
          return { ...prev, [question.id]: !currentValue };
        }

        if (question.type === 'select' && question.options && question.options.length > 0) {
          const options = question.options;
          const currentIndex = options.findIndex((opt) => opt.value === currentValue);
          let nextIndex = currentIndex + delta;
          if (nextIndex < 0) nextIndex = options.length - 1;
          if (nextIndex >= options.length) nextIndex = 0;
          const nextValue = options[nextIndex]?.value ?? options[0]!.value;
          return { ...prev, [question.id]: nextValue };
        }

        return prev;
      });
    },
    [focusedIndex, questions]
  );

  const setBooleanValue = useCallback(
    (value: boolean) => {
      const question = questions[focusedIndex];
      if (!question || question.type !== 'boolean') return;
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    },
    [focusedIndex, questions]
  );

  useInput(
    (input, key) => {
      if (key.escape && onCancel) {
        onCancel();
        return;
      }

      if (key.return) {
        onConfirm(answers);
        return;
      }

      if (key.upArrow) {
        moveFocus(-1);
        return;
      }

      if (key.downArrow) {
        moveFocus(1);
        return;
      }

      if (key.leftArrow) {
        changeValue(-1);
        return;
      }

      if (key.rightArrow) {
        changeValue(1);
        return;
      }

      const lower = input.toLowerCase();
      if (lower === 'y') {
        setBooleanValue(true);
      } else if (lower === 'n') {
        setBooleanValue(false);
      }
    },
    { isActive }
  );

  return {
    focusedIndex,
    answers,
    setFocusedIndex,
    setAnswers,
  };
}
