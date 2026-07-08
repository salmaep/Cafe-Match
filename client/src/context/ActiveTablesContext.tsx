import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { tablesApi, type MyTable, type MyJoinRequest } from "../api/tables.api";
import { useAuth } from "./AuthContext";

interface ActiveTablesValue {
  /** Cafes that currently have ≥1 open table — drives the emerald map pins. */
  activeCafeIds: Set<number>;
  /** The logged-in user's own open table (host view), if any. */
  myTable: MyTable | null;
  /** The logged-in user's outgoing join requests. */
  myRequests: MyJoinRequest[];
  refresh: () => Promise<void>;
}

const ActiveTablesContext = createContext<ActiveTablesValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

/**
 * Polls open-table state (same pause-when-hidden pattern as
 * ActiveCheckinContext). The active-cafes endpoint is public, so pins work
 * even when logged out; myTable/myRequests only load for logged-in users.
 */
export function ActiveTablesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeCafeIds, setActiveCafeIds] = useState<Set<number>>(new Set());
  const [myTable, setMyTable] = useState<MyTable | null>(null);
  const [myRequests, setMyRequests] = useState<MyJoinRequest[]>([]);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await tablesApi.activeCafes();
      setActiveCafeIds(new Set(res.data.cafeIds ?? []));
    } catch {
      // keep last known pins on transient errors
    }
    if (!user) {
      setMyTable(null);
      setMyRequests([]);
      return;
    }
    try {
      const [mine, requests] = await Promise.all([
        tablesApi.myActive(),
        tablesApi.myRequests(),
      ]);
      setMyTable(mine.data ?? null);
      setMyRequests(requests.data ?? []);
    } catch {
      // ignore — next poll retries
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      refresh();
    };

    const startPolling = () => {
      if (pollRef.current != null) return;
      pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollRef.current == null) return;
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        tick();
        startPolling();
      }
    };

    tick();
    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <ActiveTablesContext.Provider
      value={{ activeCafeIds, myTable, myRequests, refresh }}
    >
      {children}
    </ActiveTablesContext.Provider>
  );
}

export function useActiveTables(): ActiveTablesValue {
  const ctx = useContext(ActiveTablesContext);
  if (!ctx) {
    throw new Error("useActiveTables must be used inside ActiveTablesProvider");
  }
  return ctx;
}
