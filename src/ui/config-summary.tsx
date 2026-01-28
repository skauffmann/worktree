import React from "react";
import { Box, Text } from "ink";
import { Confirm } from "./confirm.tsx";
import type { DefaultValues } from "../lib/config.ts";

interface ConfigSummaryProps {
  repoName: string;
  defaults: DefaultValues;
  onConfirm: (useDefaults: boolean) => void;
  onCancel?: () => void;
}

function formatValue(key: keyof DefaultValues, value: unknown): string {
  if (value === undefined) return "not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "dotEnvAction") {
    const labels: Record<string, string> = {
      symlink: "Symlink",
      copy: "Copy",
      nothing: "Nothing",
    };
    return labels[value as string] || String(value);
  }
  return String(value);
}

export function ConfigSummary({
  repoName,
  defaults,
  onConfirm,
  onCancel,
}: ConfigSummaryProps) {
  const entries: { label: string; key: keyof DefaultValues }[] = [
    { label: "Env files", key: "dotEnvAction" },
    { label: "Copy generated files", key: "copyGeneratedFiles" },
    { label: "Install dependencies", key: "installDependencies" },
    { label: "Open in editor", key: "openInEditor" },
    { label: "Open in terminal", key: "openInTerminal" },
  ];

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Saved Configuration for {repoName}
        </Text>
        {entries.map(({ label, key }) => {
          const value = defaults[key];
          if (value === undefined) return null;
          return (
            <Text key={key}>
              <Text dimColor>• {label}:</Text> {formatValue(key, value)}
            </Text>
          );
        })}
      </Box>
      <Confirm
        message="Use saved configuration?"
        defaultValue={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Box>
  );
}
