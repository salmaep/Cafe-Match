import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cm_search_history";
const MAX_ITEMS = 8;

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStore(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or privacy mode — silent.
  }
}

/**
 * MRU search history persisted to localStorage. Returns the latest 8 unique
 * terms with the most recent first. `push` is case-insensitive on dedup but
 * preserves the original casing the user typed.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => readStore());

  // Sync across tabs (e.g., user clears in another tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setHistory(next);
    writeStore(next);
  }, []);

  const push = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setHistory((prev) => {
        const lower = trimmed.toLowerCase();
        const filtered = prev.filter((t) => t.toLowerCase() !== lower);
        const next = [trimmed, ...filtered].slice(0, MAX_ITEMS);
        writeStore(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (term: string) => {
      const lower = term.toLowerCase();
      setHistory((prev) => {
        const next = prev.filter((t) => t.toLowerCase() !== lower);
        writeStore(next);
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { history, push, remove, clear };
}
