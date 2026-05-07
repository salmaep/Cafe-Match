import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { checkinsApi, type Checkin } from '../api/checkins.api';
import { useAuth } from './AuthContext';

interface ActiveCheckinValue {
  active: Checkin | null;
  loading: boolean;
  refresh: () => Promise<void>;
  checkIn: (args: { cafeId: number; latitude: number; longitude: number }) => Promise<Checkin>;
  checkOut: (args?: { checkinId?: number; cafeId?: number }) => Promise<void>;
}

const ActiveCheckinContext = createContext<ActiveCheckinValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function ActiveCheckinProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setActive(null);
      return;
    }
    setLoading(true);
    try {
      const res = await checkinsApi.getActive();
      setActive(res.data ?? null);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch + polling. Polling pauses when tab hidden to save battery
  // and re-resumes (with immediate fetch) when tab visible again.
  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }

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

    // Initial fetch + start polling if visible
    tick();
    if (!document.hidden) startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, refresh]);

  const checkIn = useCallback(
    async (args: { cafeId: number; latitude: number; longitude: number }) => {
      const res = await checkinsApi.checkIn(args);
      setActive(res.data);
      return res.data;
    },
    [],
  );

  const checkOut = useCallback(
    async (args: { checkinId?: number; cafeId?: number } = {}) => {
      await checkinsApi.checkOut(args);
      setActive(null);
    },
    [],
  );

  return (
    <ActiveCheckinContext.Provider
      value={{ active, loading, refresh, checkIn, checkOut }}
    >
      {children}
    </ActiveCheckinContext.Provider>
  );
}

export function useActiveCheckin(): ActiveCheckinValue {
  const ctx = useContext(ActiveCheckinContext);
  if (!ctx) {
    throw new Error('useActiveCheckin must be used inside ActiveCheckinProvider');
  }
  return ctx;
}
