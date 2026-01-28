import { useState, useEffect, useCallback } from 'react';

export interface Operation {
  id: string;
  label: string;
  run: () => Promise<{ success: boolean; message?: string }>;
}

export type OperationStatus = 'pending' | 'running' | 'success' | 'warning' | 'error';

export interface OperationState {
  id: string;
  label: string;
  status: OperationStatus;
  message?: string;
}

interface UseOperationsResult {
  states: OperationState[];
  isComplete: boolean;
  isSuccess: boolean;
}

export function useOperations(
  operations: Operation[],
  onComplete?: (success: boolean, message: string) => void
): UseOperationsResult {
  const [states, setStates] = useState<OperationState[]>(() =>
    operations.map((op) => ({
      id: op.id,
      label: op.label,
      status: 'pending' as const,
    }))
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateState = useCallback((index: number, update: Partial<OperationState>) => {
    setStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runAll() {
      let allSuccess = true;
      let lastMessage = '';

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op || cancelled) break;

        updateState(i, { status: 'running' });

        try {
          const result = await op.run();
          lastMessage = result.message || '';

          if (cancelled) break;

          updateState(i, {
            status: result.success ? 'success' : 'warning',
            message: result.message,
          });

          if (!result.success) {
            allSuccess = false;
          }
        } catch (err) {
          if (cancelled) break;

          const errorMessage = err instanceof Error ? err.message : String(err);
          lastMessage = errorMessage;

          updateState(i, { status: 'error', message: errorMessage });
          allSuccess = false;
          break;
        }
      }

      if (!cancelled) {
        setIsComplete(true);
        setIsSuccess(allSuccess);
        onComplete?.(allSuccess, lastMessage);
      }
    }

    if (operations.length > 0) {
      runAll();
    } else {
      setIsComplete(true);
      setIsSuccess(true);
      onComplete?.(true, '');
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { states, isComplete, isSuccess };
}
