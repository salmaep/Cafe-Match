import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cm_search_history';
const MAX_ITEMS = 8;

/**
 * Recent search terms persisted to AsyncStorage (most-recent-first, max 8).
 * Dedup is case-insensitive but the newest entry's casing wins. Native has no
 * cross-tab sync, so (unlike web) there's no storage-event listener.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((x): x is string => typeof x === 'string'));
        }
      } catch {
        // corrupt/unreadable — start empty
      }
    })();
  }, []);

  const persist = useCallback((items: string[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, []);

  const push = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      setHistory((prev) => {
        const withoutDup = prev.filter(
          (t) => t.toLowerCase() !== clean.toLowerCase(),
        );
        const next = [clean, ...withoutDup].slice(0, MAX_ITEMS);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (term: string) => {
      setHistory((prev) => {
        const next = prev.filter((t) => t !== term);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setHistory([]);
    persist([]);
  }, [persist]);

  return { history, push, remove, clear };
}
