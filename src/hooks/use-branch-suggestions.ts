import { useState, useEffect } from 'react';
import { listWorktrees, listRemoteBranches } from '../lib/git.ts';

type State =
  | { status: 'loading' }
  | { status: 'loaded'; suggestions: string[] }
  | { status: 'error'; message: string };

export function useBranchSuggestions() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [worktrees, remoteBranches] = await Promise.all([
          listWorktrees(),
          listRemoteBranches(),
        ]);

        const suggestions = new Set<string>();

        for (const wt of worktrees) {
          if (wt.branch) {
            suggestions.add(wt.branch);
          }
        }

        for (const rb of remoteBranches) {
          suggestions.add(rb.fullRef);
          suggestions.add(rb.branch);
        }

        if (!cancelled) {
          setState({
            status: 'loaded',
            suggestions: Array.from(suggestions).sort(),
          });
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
