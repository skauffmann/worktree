import React, { useState } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";

// Symbol for cancellation
export const CANCEL_SYMBOL = Symbol.for("ink:cancel");

// Color theme
const theme = {
  primary: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
  muted: "gray",
} as const;

// ==================== Intro ====================
interface IntroProps {
  message: string;
}

function IntroComponent({ message }: IntroProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={theme.primary} bold>◆</Text>
        <Text bold> {message}</Text>
      </Box>
    </Box>
  );
}

export function intro(message: string): void {
  render(<IntroComponent message={message} />);
}

// ==================== Outro ====================
interface OutroProps {
  message: string;
}

function OutroComponent({ message }: OutroProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={theme.success}>◇</Text>
        <Text> {message}</Text>
      </Box>
    </Box>
  );
}

export function outro(message: string): void {
  render(<OutroComponent message={message} />);
}

// ==================== Cancel ====================
interface CancelProps {
  message: string;
}

function CancelComponent({ message }: CancelProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={theme.error}>■</Text>
        <Text color={theme.error}> {message}</Text>
      </Box>
    </Box>
  );
}

export function cancel(message: string): void {
  render(<CancelComponent message={message} />);
}

// ==================== Note ====================
interface NoteProps {
  message: string;
  title?: string;
}

function NoteComponent({ message, title }: NoteProps) {
  const lines = message.split("\n");
  const maxLineLength = Math.max(...lines.map(l => l.length), title?.length || 0);
  const border = "─".repeat(maxLineLength + 2);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color={theme.muted}>┌</Text>
        {title && (
          <>
            <Text color={theme.muted}>─</Text>
            <Text bold> {title} </Text>
            <Text color={theme.muted}>{"─".repeat(Math.max(0, maxLineLength - (title.length + 2)))}</Text>
          </>
        )}
        {!title && <Text color={theme.muted}>{border}</Text>}
        <Text color={theme.muted}>┐</Text>
      </Box>
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color={theme.muted}>│</Text>
          <Text> {line.padEnd(maxLineLength)} </Text>
          <Text color={theme.muted}>│</Text>
        </Box>
      ))}
      <Box>
        <Text color={theme.muted}>└{border}┘</Text>
      </Box>
    </Box>
  );
}

export function note(message: string, title?: string): void {
  render(<NoteComponent message={message} title={title} />);
}

// ==================== Log ====================
export const log = {
  info: (message: string) => {
    render(
      <Box>
        <Text color={theme.primary}>●</Text>
        <Text> {message}</Text>
      </Box>
    );
  },
  success: (message: string) => {
    render(
      <Box>
        <Text color={theme.success}>✔</Text>
        <Text> {message}</Text>
      </Box>
    );
  },
  warning: (message: string) => {
    render(
      <Box>
        <Text color={theme.warning}>▲</Text>
        <Text> {message}</Text>
      </Box>
    );
  },
  error: (message: string) => {
    render(
      <Box>
        <Text color={theme.error}>✖</Text>
        <Text> {message}</Text>
      </Box>
    );
  },
};

// ==================== Spinner ====================
interface SpinnerInstance {
  start: (message: string) => void;
  stop: (message: string) => void;
}

export function spinner(): SpinnerInstance {
  let instance: ReturnType<typeof render> | null = null;

  return {
    start: (message: string) => {
      instance = render(
        <Box>
          <Text color={theme.primary}>
            <Spinner type="dots" />
          </Text>
          <Text> {message}</Text>
        </Box>
      );
    },
    stop: (message: string) => {
      if (instance) {
        instance.clear();
        instance.unmount();
      }
      render(
        <Box>
          <Text color={theme.success}>◇</Text>
          <Text> {message}</Text>
        </Box>
      );
    },
  };
}

// ==================== Text Prompt ====================
interface TextPromptProps {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
  onSubmit: (value: string | typeof CANCEL_SYMBOL) => void;
}

function TextPromptComponent({ message, placeholder, defaultValue, validate, onSubmit }: TextPromptProps) {
  const [value, setValue] = useState(defaultValue || "");
  const [error, setError] = useState<string | undefined>();
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) {
      onSubmit(CANCEL_SYMBOL);
      exit();
    }
  });

  const handleSubmit = (val: string) => {
    const finalValue = val || defaultValue || "";
    if (validate) {
      const validationError = validate(finalValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    onSubmit(finalValue);
    exit();
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.primary}>◆</Text>
        <Text bold> {message}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color={theme.muted}>│ </Text>
        <TextInput
          value={value}
          onChange={(val) => {
            setValue(val);
            setError(undefined);
          }}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color={theme.error}>  {error}</Text>
        </Box>
      )}
    </Box>
  );
}

export async function text(options: {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}): Promise<string | typeof CANCEL_SYMBOL> {
  return new Promise((resolve) => {
    render(
      <TextPromptComponent
        message={options.message}
        placeholder={options.placeholder}
        defaultValue={options.defaultValue}
        validate={options.validate}
        onSubmit={resolve}
      />
    );
  });
}

// ==================== Confirm Prompt ====================
interface ConfirmPromptProps {
  message: string;
  initialValue?: boolean;
  onSubmit: (value: boolean | typeof CANCEL_SYMBOL) => void;
}

function ConfirmPromptComponent({ message, initialValue = false, onSubmit }: ConfirmPromptProps) {
  const [value, setValue] = useState(initialValue);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) {
      onSubmit(CANCEL_SYMBOL);
      exit();
    }
    if (input === "y" || input === "Y") {
      onSubmit(true);
      exit();
    }
    if (input === "n" || input === "N") {
      onSubmit(false);
      exit();
    }
    if (key.leftArrow || key.rightArrow) {
      setValue(!value);
    }
    if (key.return) {
      onSubmit(value);
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.primary}>◆</Text>
        <Text bold> {message}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color={theme.muted}>│ </Text>
        <Text color={value ? theme.success : theme.muted} bold={value}>
          {value ? "● " : "○ "}Yes
        </Text>
        <Text> / </Text>
        <Text color={!value ? theme.success : theme.muted} bold={!value}>
          {!value ? "● " : "○ "}No
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text color={theme.muted}>  ←/→ to toggle, enter to confirm, y/n for quick select</Text>
      </Box>
    </Box>
  );
}

export async function confirm(options: {
  message: string;
  initialValue?: boolean;
}): Promise<boolean | typeof CANCEL_SYMBOL> {
  return new Promise((resolve) => {
    render(
      <ConfirmPromptComponent
        message={options.message}
        initialValue={options.initialValue}
        onSubmit={resolve}
      />
    );
  });
}

// ==================== Select Prompt ====================
interface SelectOption<T> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectPromptProps<T> {
  message: string;
  options: SelectOption<T>[];
  initialValue?: T;
  onSubmit: (value: T | typeof CANCEL_SYMBOL) => void;
}

function SelectPromptComponent<T>({ message, options, initialValue, onSubmit }: SelectPromptProps<T>) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) {
      onSubmit(CANCEL_SYMBOL);
      exit();
    }
  });

  const initialIndex = initialValue
    ? options.findIndex(opt => opt.value === initialValue)
    : 0;

  const handleSelect = (item: { value: T }) => {
    onSubmit(item.value);
    exit();
  };

  const items = options.map(opt => ({
    label: opt.hint ? `${opt.label} (${opt.hint})` : opt.label,
    value: opt.value,
  }));

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.primary}>◆</Text>
        <Text bold> {message}</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        <SelectInput
          items={items}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          onSelect={handleSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? theme.success : theme.muted}>
              {isSelected ? "● " : "○ "}
            </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? undefined : theme.muted}>{label}</Text>
          )}
        />
      </Box>
    </Box>
  );
}

export async function select<T>(options: {
  message: string;
  options: SelectOption<T>[];
  initialValue?: T;
}): Promise<T | typeof CANCEL_SYMBOL> {
  return new Promise((resolve) => {
    render(
      <SelectPromptComponent
        message={options.message}
        options={options.options}
        initialValue={options.initialValue}
        onSubmit={resolve}
      />
    );
  });
}

// ==================== Multiselect Prompt ====================
interface MultiselectPromptProps<T> {
  message: string;
  options: SelectOption<T>[];
  initialValues?: T[];
  required?: boolean;
  onSubmit: (value: T[] | typeof CANCEL_SYMBOL) => void;
}

function MultiselectPromptComponent<T>({ message, options, initialValues = [], required = true, onSubmit }: MultiselectPromptProps<T>) {
  const [selectedValues, setSelectedValues] = useState<Set<T>>(new Set(initialValues));
  const [cursorIndex, setCursorIndex] = useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) {
      onSubmit(CANCEL_SYMBOL);
      exit();
    }
    if (key.upArrow) {
      setCursorIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursorIndex(prev => Math.min(options.length - 1, prev + 1));
    }
    if (input === " ") {
      const currentOption = options[cursorIndex];
      if (currentOption) {
        setSelectedValues(prev => {
          const next = new Set(prev);
          if (next.has(currentOption.value)) {
            next.delete(currentOption.value);
          } else {
            next.add(currentOption.value);
          }
          return next;
        });
      }
    }
    if (key.return) {
      const selected = Array.from(selectedValues);
      if (required && selected.length === 0) {
        return;
      }
      onSubmit(selected);
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.primary}>◆</Text>
        <Text bold> {message}</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        {options.map((opt, index) => {
          const isSelected = selectedValues.has(opt.value);
          const isCursor = index === cursorIndex;
          return (
            <Box key={index}>
              <Text color={isCursor ? theme.primary : theme.muted}>
                {isCursor ? "❯ " : "  "}
              </Text>
              <Text color={isSelected ? theme.success : theme.muted}>
                {isSelected ? "◼ " : "◻ "}
              </Text>
              <Text color={isCursor ? undefined : theme.muted}>
                {opt.label}
                {opt.hint && <Text color={theme.muted}> ({opt.hint})</Text>}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginLeft={2}>
        <Text color={theme.muted}>  ↑/↓ to move, space to toggle, enter to confirm</Text>
      </Box>
    </Box>
  );
}

export async function multiselect<T>(options: {
  message: string;
  options: SelectOption<T>[];
  initialValues?: T[];
  required?: boolean;
}): Promise<T[] | typeof CANCEL_SYMBOL> {
  return new Promise((resolve) => {
    render(
      <MultiselectPromptComponent
        message={options.message}
        options={options.options}
        initialValues={options.initialValues}
        required={options.required}
        onSubmit={resolve}
      />
    );
  });
}

// ==================== isCancel utility ====================
export function isCancel(value: unknown): value is typeof CANCEL_SYMBOL {
  return value === CANCEL_SYMBOL;
}
