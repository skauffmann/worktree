import React from "react";
import { Box, Text } from "ink";
import { Confirm } from "./confirm.tsx";
import type { DefaultValues } from "../lib/config.ts";

interface SaveConfigProps {
  defaults: DefaultValues;
  onConfirm: (save: boolean) => void;
  onCancel?: () => void;
}

export function SaveConfig({ defaults, onConfirm, onCancel }: SaveConfigProps) {
  return (
    <Box flexDirection="column">
      <Confirm
        message="Save these settings for future use?"
        defaultValue={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Box>
  );
}
