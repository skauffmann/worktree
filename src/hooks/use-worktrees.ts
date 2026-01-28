import { useState, useEffect } from 'react';
import { listWorktrees, getBranchStatus, type WorktreeInfo } from '../lib/git.ts';

export interface WorktreeWithStatus extends WorktreeInfo {
  ahead: number;
  behind: number;
  hasRemote: boolean;
}

type State =
  | { status: 'loading' }
  | { status: 'loaded'; worktrees: WorktreeWithStatus[] }
  | { status: 'error'; message: string };

export function useWorktrees() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const worktrees = await listWorktrees();
        const filtered = worktrees.filter((wt) => !wt.isMain);

        const withStatus = await Promise.all(
          filtered.map(async (wt) => {
            if (!wt.branch) {
              return { ...wt, ahead: 0, behind: 0, hasRemote: false };
            }
            const status = await getBranchStatus(wt.branch);
            return {
              ...wt,
              ahead: status?.ahead || 0,
              behind: status?.behind || 0,
              hasRemote: status !== null,
            };
          })
        );

        if (!cancelled) {
          setState({ status: 'loaded', worktrees: withStatus });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: String(err) });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
