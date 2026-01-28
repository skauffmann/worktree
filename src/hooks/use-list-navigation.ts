import { useState, useCallback } from 'react';
import { useInput } from 'ink';

interface UseListNavigationOptions {
  itemCount: number;
  initialIndex?: number;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
  isActive?: boolean;
}

export function useListNavigation({
  itemCount,
  initialIndex = 0,
  onSelect,
  onCancel,
  isActive = true,
}: UseListNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
  }, [itemCount]);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
  }, [itemCount]);

  useInput(
    (input, key) => {
      if (key.escape && onCancel) {
        onCancel();
        return;
      }

      if (key.upArrow) {
        moveUp();
      } else if (key.downArrow) {
        moveDown();
      } else if (key.return && onSelect) {
        onSelect(selectedIndex);
      }
    },
    { isActive }
  );

  return {
    selectedIndex,
    setSelectedIndex,
    moveUp,
    moveDown,
  };
}
