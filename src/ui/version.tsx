import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import {
  checkForUpdate,
  detectInstalledVia,
  getUpdateCommand,
  type VersionCheckResult,
} from '../lib/version.ts';

type VersionState =
  | { status: 'loading' }
  | { status: 'loaded'; result: VersionCheckResult }
  | { status: 'error' };

export function Version() {
  const [state, setState] = useState<VersionState>({ status: 'loading' });

  useEffect(() => {
    checkForUpdate()
      .then((result) => {
        if (result) {
          setState({ status: 'loaded', result });
        } else {
          setState({ status: 'error' });
        }
      })
      .catch(() => {
        setState({ status: 'error' });
      });
  }, []);

  if (state.status === 'loading') {
    return (
      <Text>
        <Spinner type="dots" /> Checking version...
      </Text>
    );
  }

  if (state.status === 'error') {
    return <Text>v?.?.?</Text>;
  }

  const { result } = state;
  const updateCommand = getUpdateCommand(detectInstalledVia());

  if (result.updateAvailable) {
    return (
      <Text>
        v{result.currentVersion} <Text color="yellow">(outdated)</Text> - Run: {updateCommand}
      </Text>
    );
  }

  return <Text>v{result.currentVersion} (latest)</Text>;
}
