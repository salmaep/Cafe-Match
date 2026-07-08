import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  fetchActiveCafeIdsApi,
  fetchMyActiveTableApi,
  MyActiveTable,
  openTableApi,
  closeTableApi,
  OpenTablePayload,
} from '../services/api';

const ACTIVE_CAFES_POLL_MS = 30_000;
const MY_ACTIVE_POLL_MS = 15_000;

interface Ctx {
  activeCafeIds: Set<number>;
  myActive: MyActiveTable | null;
  refresh: () => Promise<void>;
  create: (payload: OpenTablePayload) => Promise<{ id: number }>;
  closeMine: () => Promise<void>;
}

const OpenTablesContext = createContext<Ctx | null>(null);

export const useOpenTables = () => {
  const ctx = useContext(OpenTablesContext);
  if (!ctx)
    throw new Error('useOpenTables must be used within OpenTablesProvider');
  return ctx;
};

export function OpenTablesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeCafeIds, setActiveCafeIds] = useState<Set<number>>(new Set());
  const [myActive, setMyActive] = useState<MyActiveTable | null>(null);

  const refreshActiveCafes = useCallback(async () => {
    try {
      const ids = await fetchActiveCafeIdsApi();
      setActiveCafeIds(new Set(ids));
    } catch {}
  }, []);

  const refreshMyActive = useCallback(async () => {
    if (!user) {
      setMyActive(null);
      return;
    }
    try {
      const t = await fetchMyActiveTableApi();
      setMyActive(t);
    } catch {
      setMyActive(null);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshActiveCafes(), refreshMyActive()]);
  }, [refreshActiveCafes, refreshMyActive]);

  useEffect(() => {
    refreshActiveCafes();
    const iv = setInterval(refreshActiveCafes, ACTIVE_CAFES_POLL_MS);
    return () => clearInterval(iv);
  }, [refreshActiveCafes]);

  useEffect(() => {
    refreshMyActive();
    if (!user) return;
    const iv = setInterval(refreshMyActive, MY_ACTIVE_POLL_MS);
    return () => clearInterval(iv);
  }, [refreshMyActive, user]);

  const create = useCallback(
    async (payload: OpenTablePayload) => {
      const res = await openTableApi(payload);
      await refresh();
      return res;
    },
    [refresh],
  );

  const closeMine = useCallback(async () => {
    if (!myActive) return;
    await closeTableApi(myActive.id);
    await refresh();
  }, [myActive, refresh]);

  const value = useMemo<Ctx>(
    () => ({ activeCafeIds, myActive, refresh, create, closeMine }),
    [activeCafeIds, myActive, refresh, create, closeMine],
  );

  return (
    <OpenTablesContext.Provider value={value}>
      {children}
    </OpenTablesContext.Provider>
  );
}
