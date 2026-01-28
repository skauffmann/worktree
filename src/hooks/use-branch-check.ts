import { useState, useEffect } from 'react';
import { branchExists } from '../lib/git.ts';

export type BranchStatus =
  | { status: 'checking' }
  | { status: 'not-found' }
  | { status: 'local' }
  | { status: 'remote' };

export function useBranchCheck(branchName: string) {
  const [state, setState] = useState<BranchStatus>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await branchExists(branchName);

        if (cancelled) return;

        if (result.local) {
          setState({ status: 'local' });
        } else if (result.remote) {
          setState({ status: 'remote' });
        } else {
          setState({ status: 'not-found' });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'not-found' });
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [branchName]);

  return state;
}
