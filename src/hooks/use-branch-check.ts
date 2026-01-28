import { useState, useEffect } from 'react';
import { branchExists, parseRemoteBranch, remoteRefExists, type RemoteBranchRef } from '../lib/git.ts';

export type BranchStatus =
  | { status: 'checking' }
  | { status: 'not-found' }
  | { status: 'local' }
  | { status: 'remote' }
  | { status: 'remote-ref'; remoteRef: RemoteBranchRef };

export function useBranchCheck(branchName: string) {
  const [state, setState] = useState<BranchStatus>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const remoteRef = parseRemoteBranch(branchName);

        if (remoteRef) {
          const exists = await remoteRefExists(remoteRef.remote, remoteRef.branch);
          if (cancelled) return;

          if (exists) {
            setState({ status: 'remote-ref', remoteRef });
          } else {
            setState({ status: 'not-found' });
          }
          return;
        }

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
