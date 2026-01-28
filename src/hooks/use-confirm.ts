import { useState, useCallback } from 'react';
import { useInput } from 'ink';

interface UseConfirmOptions {
  defaultValue?: boolean;
  onConfirm: (value: boolean) => void;
  onCancel?: () => void;
  isActive?: boolean;
}

export function useConfirm({
  defaultValue = true,
  onConfirm,
  onCancel,
  isActive = true,
}: UseConfirmOptions) {
  const [value, setValue] = useState(defaultValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  useInput(
    (input, key) => {
      if (key.escape && onCancel) {
        onCancel();
        return;
      }

      if (key.return) {
        onConfirm(value);
        return;
      }

      const lower = input.toLowerCase();
      if (lower === 'y') {
        onConfirm(true);
      } else if (lower === 'n') {
        onConfirm(false);
      } else if (key.leftArrow || key.rightArrow) {
        toggle();
      }
    },
    { isActive }
  );

  return { value, toggle };
}
